import type { ServerWebSocket, Server } from "bun";

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

let server: Server<ClientData> | null = null;

// --- Helper Functions ---

function isOriginAllowed(req: Request): boolean {
    const origin = req.headers.get("Origin");
    // SECURITY: Reject connections from regular websites (http/https)
    if (origin && (origin.startsWith("http://") || origin.startsWith("https://"))) {
        return false;
    }
    return true;
}

function parseMessage(message: string | Buffer): any {
    const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
    return JSON.parse(text);
}

// --- WebSocket Handlers ---

function handleOpen(ws: ServerWebSocket<ClientData>) {
    // Wait for handshake
    // Set a timeout to disconnect if no handshake received
    setTimeout(() => {
        if (!ws.data.verified) {
            ws.close(1008, "Handshake Timeout");
        }
    }, 3000);
}

function handleHandshake(ws: ServerWebSocket<ClientData>, message: string | Buffer) {
    try {
        const data = parseMessage(message);
        
        if (data.type === 'HANDSHAKE' && data.key === HANDSHAKE_KEY) {
            ws.data.verified = true;
            clients.add(ws);
            ws.send(JSON.stringify({ type: 'HANDSHAKE_ACK' }));
            // console.log('Client verified and connected');
        } else {
            ws.send(JSON.stringify({ type: 'HANDSHAKE_FAIL' }));
            ws.close(1008, "Invalid Handshake");
        }
    } catch (e) {
        ws.close(1008, "Invalid Handshake Format");
    }
}

function handleMessage(ws: ServerWebSocket<ClientData>, message: string | Buffer) {
    if (!ws.data.verified) {
        handleHandshake(ws, message);
        return;
    }

    // Handle other messages if needed (currently one-way)
}

function handleClose(ws: ServerWebSocket<ClientData>) {
    clients.delete(ws);
}

// --- HTTP Handler ---

function handleFetch(req: Request, server: Server<ClientData>): Response | undefined {
    if (!isOriginAllowed(req)) {
        const origin = req.headers.get("Origin");
        console.log(`Blocked connection attempt from unauthorized origin: ${origin}`);
        return new Response("Forbidden: Unauthorized Origin", { status: 403 });
    }

    // Upgrade to WebSocket with initial unverified state
    if (server.upgrade(req, { data: { verified: false } })) {
        return undefined;
    }

    return new Response("Pomolocal WebSocket Server");
}

// --- Server Management ---

export function startServer() {
    for (const port of WS_PORTS) {
        try {
            server = Bun.serve<ClientData>({
                port,
                fetch: handleFetch,
                websocket: {
                    open: handleOpen,
                    message: handleMessage,
                    close: handleClose
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
