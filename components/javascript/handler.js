export function createHandler({ language, runtime, apis, getVariable, probe }) {
  return async function handler(request) {
    const path = new URL(request.url).pathname.replace(/\/$/, "");
    if (path === `/api/${language.toLowerCase()}`) {
      if (request.method !== "GET") return new Response(null, { status: 405, headers: { allow: "GET" } });
      return Response.json({ language, runtime, apis });
    }
    const prefix = `/api/${language.toLowerCase()}/probe/`;
    if (!path.startsWith(prefix)) return Response.json({ error: "Not found" }, { status: 404 });
    const token = getVariable("api_token");
    const expected = new TextEncoder().encode(`Bearer ${token ?? ""}`);
    const provided = new TextEncoder().encode(request.headers.get("authorization") ?? "");
    if (!token || token.length < 24 || expected.length !== provided.length) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ provided[index];
    if (difference !== 0) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const api = path.slice(prefix.length);
    if (!apis.includes(api)) return Response.json({ error: "Unknown API probe" }, { status: 404 });
    const expectedMethod = api === "llm" ? "POST" : "GET";
    if (request.method !== expectedMethod) {
      return new Response(null, { status: 405, headers: { allow: expectedMethod } });
    }
    try {
      return Response.json({ language, api, result: await probe(api, request) }, { headers: { "cache-control": "no-store" } });
    } catch {
      return Response.json({ error: "Spin API probe failed", api }, { status: 503 });
    }
  };
}