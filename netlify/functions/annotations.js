import { getStore } from "@netlify/blobs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const store = getStore("bm-cocoluna-annotations");

  if (req.method === "GET") {
    const data = (await store.get("annotations", { type: "json" })) || {};
    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid json" }), {
        status: 400,
        headers: { "content-type": "application/json", ...CORS_HEADERS },
      });
    }

    // Two supported operations:
    // 1) { op: "set", viewKey, entityType, key, value } — set/clear a single annotation
    // 2) { op: "replaceAll", data: {...} } — bulk import (used by the "Importar ajustes" button)
    let data = (await store.get("annotations", { type: "json" })) || {};

    if (body.op === "replaceAll" && body.data) {
      data = body.data;
    } else if (body.op === "set") {
      const { viewKey, entityType, key, value } = body;
      if (!viewKey || !entityType || !key) {
        return new Response(JSON.stringify({ error: "missing fields" }), {
          status: 400,
          headers: { "content-type": "application/json", ...CORS_HEADERS },
        });
      }
      if (!data[viewKey]) data[viewKey] = {};
      if (!data[viewKey][entityType]) data[viewKey][entityType] = {};
      if (value) {
        data[viewKey][entityType][key] = value;
      } else {
        delete data[viewKey][entityType][key];
      }
    } else {
      return new Response(JSON.stringify({ error: "unknown op" }), {
        status: 400,
        headers: { "content-type": "application/json", ...CORS_HEADERS },
      });
    }

    await store.setJSON("annotations", data);
    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
};

export const config = { path: "/api/annotations" };
