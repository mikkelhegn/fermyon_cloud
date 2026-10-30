export async function handler(request) {
  if (request.method !== "GET") {
    return new Response(null, { status: 405, headers: { allow: "GET" } });
  }
  console.log("component=javascript event=request");
  return Response.json({ language: "JavaScript", runtime: "WASI Preview 2" });
}

addEventListener("fetch", (event) => event.respondWith(handler(event.request)));