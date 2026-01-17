import { ServerWebSocket } from "bun";

const clients = new Set<ServerWebSocket<unknown>>();

export interface Message {
    type: "STATE_UPDATE";
    mode: "FOCUS" | "RELAX" | "FINISHED";
    blockedDomains?: string[];
}

export function startServer(port: number = 9999) {
    Bun.serve({
        port,
        fetch(req, server) {
            if (server.upgrade(req)) {
                return; // upgrade successful
            }
            return new Response("Pomolocal WebSocket Server");
        },
        websocket: {
            open(ws) {
                clients.add(ws);
            },
            message(ws, message) {
                // Keep-alive handling if needed, though mostly one-way
            },
            close(ws) {
                clients.delete(ws);
            }
        }
    });
}

export function broadcast(message: Message) {
    const msg = JSON.stringify(message);
    for (const ws of clients) {
        ws.send(msg);
    }
}
