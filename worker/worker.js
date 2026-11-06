
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store"
};

function response(data, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

function base64url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode64url(value) {
  const s = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(s + "=".repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function signingKey(secret, usages) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages
  );
}

async function createToken(secret) {
  const header = base64url(new TextEncoder().encode(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ));
  const payload = base64url(new TextEncoder().encode(
    JSON.stringify({ role: "manager", exp: Math.floor(Date.now() / 1000) + 86400 })
  ));
  const data = `${header}.${payload}`;
  const key = await signingKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(data)
  );
  return `${data}.${base64url(new Uint8Array(signature))}`;
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const key = await signingKey(secret, ["verify"]);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decode64url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );

    if (!valid) return false;

    const payload = JSON.parse(
      new TextDecoder().decode(decode64url(parts[1]))
    );

    return payload.role === "manager" &&
      payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeShift(data, id) {
  const employee = clean(data.employee, 100);
  const date = clean(data.date, 10);
  const start = clean(data.start, 5);
  const end = clean(data.end, 5);

  if (!employee || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) {
    throw new Error("Operatore, data o orari non validi");
  }

  let mates = data.mates ?? [];
  if (typeof mates === "string") {
    try { mates = JSON.parse(mates); } catch { mates = []; }
  }
  if (!Array.isArray(mates)) mates = [];

  return {
    id,
    employee,
    date,
    start,
    end,
    zone: clean(data.zone, 100),
    role: clean(data.role, 100),
    label: clean(data.label, 150),
    note: clean(data.note, 1000),
    mates: JSON.stringify(mates),
    rest: data.rest ? 1 : 0,
    extended: data.extended ? 1 : 0
  };
}

function formatShift(row) {
  if (!row) return null;
  let mates = [];
  try { mates = JSON.parse(row.mates || "[]"); } catch {}
  return { ...row, mates };
}

async function broadcast(env, event) {
  try {
    const id = env.TURNI_ROOM.idFromName("turni-globali");
    const room = env.TURNI_ROOM.get(id);

    await room.fetch("https://room/broadcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": env.INTERNAL_SECRET || ""
      },
      body: JSON.stringify(event)
    });
  } catch (error) {
    console.error("Broadcast error:", error);
  }
}

export class TurniRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/broadcast" && request.method === "POST") {
      if (!this.env.INTERNAL_SECRET ||
          request.headers.get("X-Internal-Secret") !== this.env.INTERNAL_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

      const message = await request.text();

      for (const socket of this.ctx.getWebSockets()) {
        try { socket.send(message); } catch {}
      }

      return new Response("OK");
    }

    if (request.method !== "GET" ||
        request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket required", { status: 426 });
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

  async webSocketMessage(ws) {
    try {
      ws.send(JSON.stringify({
        type: "error",
        message: "Connessione in sola lettura"
      }));
    } catch {}
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      if (path === "/") {
        return response({
          status: "online",
          service: "Turni La Falco API"
        });
      }

      if (path === "/ws") {
        if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
          return response({ error: "WebSocket required" }, 426);
        }

        const id = env.TURNI_ROOM.idFromName("turni-globali");
        return env.TURNI_ROOM.get(id).fetch(request);
      }

      if (path === "/api/login" && request.method === "POST") {
        if (!env.MANAGER_PASSWORD || !env.SESSION_SECRET) {
          return response({ error: "Login non configurato" }, 503);
        }

        const body = await request.json();

        if (typeof body.password !== "string" ||
            body.password !== env.MANAGER_PASSWORD) {
          return response({ error: "Password non corretta" }, 401);
        }

        return response({
          success: true,
          token: await createToken(env.SESSION_SECRET),
          expiresIn: 86400
        });
      }

      if (path === "/api/shifts" && request.method === "GET") {
        const conditions = [];
        const values = [];

        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        const employee = url.searchParams.get("employee");

        if (from) {
          conditions.push("date >= ?");
          values.push(from);
        }
        if (to) {
          conditions.push("date <= ?");
          values.push(to);
        }
        if (employee) {
          conditions.push("employee = ?");
          values.push(employee);
        }

        const where = conditions.length
          ? "WHERE " + conditions.join(" AND ")
          : "";

        const result = await env.DB.prepare(
          `SELECT * FROM shifts ${where} ORDER BY date, start, employee`
        ).bind(...values).all();

        return response({
          shifts: (result.results || []).map(formatShift)
        });
      }

      if (path.startsWith("/api/")) {
        const authorization = request.headers.get("Authorization") || "";
        const token = authorization.startsWith("Bearer ")
          ? authorization.slice(7)
          : "";

        if (!env.SESSION_SECRET ||
            !await verifyToken(token, env.SESSION_SECRET)) {
          return response({ error: "Accesso non autorizzato" }, 401);
        }
      }

      if (path === "/api/shifts" && request.method === "POST") {
        const body = await request.json();
        const shift = normalizeShift(body, crypto.randomUUID());

        await env.DB.prepare(`
          INSERT INTO shifts
          (id, employee, date, start, end, zone, role, label, note, mates, rest, extended)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          shift.id, shift.employee, shift.date, shift.start, shift.end,
          shift.zone, shift.role, shift.label, shift.note,
          shift.mates, shift.rest, shift.extended
        ).run();

        const saved = formatShift(shift);
        await broadcast(env, { type: "shift.created", shift: saved });

        return response({ success: true, shift: saved }, 201);
      }

      const match = path.match(/^\/api\/shifts\/([^/]+)$/);

      if (match && request.method === "PUT") {
        const id = decodeURIComponent(match[1]);
        const existing = await env.DB.prepare(
          "SELECT * FROM shifts WHERE id = ?"
        ).bind(id).first();

        if (!existing) return response({ error: "Turno non trovato" }, 404);

        const body = await request.json();
        const shift = normalizeShift(
          { ...existing, ...body }, id
        );

        await env.DB.prepare(`
          UPDATE shifts SET
          employee=?, date=?, start=?, end=?, zone=?, role=?,
          label=?, note=?, mates=?, rest=?, extended=?,
          updated_at=CURRENT_TIMESTAMP
          WHERE id=?
        `).bind(
          shift.employee, shift.date, shift.start, shift.end,
          shift.zone, shift.role, shift.label, shift.note,
          shift.mates, shift.rest, shift.extended, id
        ).run();

        const saved = formatShift(shift);
        await broadcast(env, { type: "shift.updated", shift: saved });

        return response({ success: true, shift: saved });
      }

      if (match && request.method === "DELETE") {
        const id = decodeURIComponent(match[1]);

        const existing = await env.DB.prepare(
          "SELECT * FROM shifts WHERE id = ?"
        ).bind(id).first();

        if (!existing) return response({ error: "Turno non trovato" }, 404);

        await env.DB.prepare(
          "DELETE FROM shifts WHERE id = ?"
        ).bind(id).run();

        await broadcast(env, {
          type: "shift.deleted",
          id
        });

        return response({ success: true, id });
      }

      return response({ error: "Endpoint non trovato" }, 404);

    } catch (error) {
      console.error(error);
      return response({
        error: error.message || "Errore interno"
      }, 500);
    }
  }
};
