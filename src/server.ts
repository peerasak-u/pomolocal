import type { ServerWebSocket } from "bun";

const WS_PORTS = [23023, 23024, 23025, 23026];
const HANDSHAKE_KEY = "pomolocal-v1-handshake-secure";

type ClientData = {
    verified: boolean;
};

const clients = new Set<ServerWebSocket<ClientData>>();

export interface Message {
    type: "STATE_UPDATE" | "HANDSHAKE_ACK" | "HANDSHAKE_FAIL";
    mode?: "FOCUS" | "RELAX" | "FINISHED" | "WARMUP";
    blockedDomains?: string[];
}

let server: ReturnType<typeof Bun.serve> | null = null;

export function startServer() {
    for (const port of WS_PORTS) {
        try {
            server = Bun.serve<ClientData>({
                port,
                fetch(req, server) {
                    const origin = req.headers.get("Origin");
                    
                    // SECURITY: Reject connections from regular websites
                    if (origin && (origin.startsWith("http://") || origin.startsWith("https://"))) {
                        console.log(`Blocked connection attempt from unauthorized origin: ${origin}`);
                        return new Response("Forbidden: Unauthorized Origin", { status: 403 });
                    }

                    // Upgrade to WebSocket with initial unverified state
                    if (server.upgrade(req, { data: { verified: false } })) {
                        return;
                    }
                    return new Response("Pomolocal WebSocket Server");
                },
                websocket: {
                    open(ws) {
                        // Wait for handshake
                        // Set a timeout to disconnect if no handshake received
                        setTimeout(() => {
                            if (!ws.data.verified) {
                                ws.close(1008, "Handshake Timeout");
                            }
                        }, 3000);
                    },
                    message(ws, message) {
                        if (!ws.data.verified) {
                            try {
                                const data = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
                                if (data.type === 'HANDSHAKE' && data.key === HANDSHAKE_KEY) {
                                    ws.data.verified = true;
                                    clients.add(ws);
                                    ws.send(JSON.stringify({ type: 'HANDSHAKE_ACK' }));
                                    console.log('Client verified and connected');
                                } else {
                                    ws.send(JSON.stringify({ type: 'HANDSHAKE_FAIL' }));
                                    ws.close(1008, "Invalid Handshake");
                                }
                            } catch (e) {
                                ws.close(1008, "Invalid Handshake Format");
                            }
                            return;
                        }

                        // Handle other messages if needed (currently one-way)
                    },
                    close(ws) {
                        clients.delete(ws);
                    }
                }
            });
            console.log(`Server started on port ${port}`);
            return; // Successfully started
        } catch (e) {
            console.warn(`Port ${port} in use, trying next...`);
            continue;
        }
    }
    
    console.error("Failed to bind to any available port!");
}

export function stopServer() {
    if (server) {
        server.stop();
        server = null;
    }
}

export function broadcast(message: Message) {
    const msg = JSON.stringify(message);
    for (const ws of clients) {
        if (ws.data.verified) {
            ws.send(msg);
        }
    }
}
