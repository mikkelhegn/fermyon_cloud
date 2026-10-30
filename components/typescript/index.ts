export async function handler(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return new Response(null, { status: 405, headers: { allow: "GET" } });
  }
  console.log("component=typescript event=request");
  return Response.json({ language: "TypeScript", runtime: "WASI Preview 2" });
}

interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response>): void;
}

addEventListener("fetch", (event) => {
  (event as FetchEvent).respondWith(handler((event as FetchEvent).request));
});