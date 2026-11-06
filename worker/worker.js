
export class TurniRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const upgrade = request.headers.get("Upgrade");

    if (upgrade !== "websocket") {
      return new Response("Turni La Falco - WebSocket pronto", {
        headers: { "Content-Type": "text/plain" }
      });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    server.send(JSON.stringify({
      type: "connected",
      message: "Connessione attiva"
    }));

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async webSocketMessage(ws, message) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket !== ws) {
        socket.send(message);
      }
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Turni La Falco API online");
    }

    if (url.pathname === "/ws") {
      const id = env.TURNI_ROOM.idFromName("turni-globali");
      const room = env.TURNI_ROOM.get(id);
      return room.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};
