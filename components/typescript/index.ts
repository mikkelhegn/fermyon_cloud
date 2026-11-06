import { openDefault as openKeyValue } from "@spinframework/spin-kv";
import { EmbeddingModels, generateEmbeddings, infer, InferencingModels } from "@spinframework/spin-llm";
import { open as openMySql } from "@spinframework/spin-mysql";
import { open as openPostgres } from "@spinframework/spin-postgres";
import { open as openRedis } from "@spinframework/spin-redis";
import { openDefault as openSqlite } from "@spinframework/spin-sqlite";
import { get as getVariable } from "@spinframework/spin-variables";

const language = "TypeScript";
const apis = ["variables", "kv", "sqlite", "llm", "mysql", "postgres", "redis", "http"];

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function authorized(request: Request): boolean {
  const token = getVariable("api_token");
  const expected = new TextEncoder().encode(`Bearer ${token ?? ""}`);
  const provided = new TextEncoder().encode(request.headers.get("authorization") ?? "");
  if (!token || token.length < 24 || expected.length !== provided.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ provided[index];
  return difference === 0;
}

async function probe(api: string, request: Request): Promise<Record<string, unknown> | null> {
  switch (api) {
    case "variables":
      return { greeting: getVariable("greeting") };
    case "kv": {
      const value = openKeyValue().get("sample");
      return { value: value === null ? null : new TextDecoder().decode(value) };
    }
    case "sqlite": {
      const result = openSqlite().execute("SELECT 1 AS value", []);
      return { value: Number(result.rows[0]?.value) };
    }
    case "llm": {
      const prompt = await request.text();
      if (!prompt.trim() || new TextEncoder().encode(prompt).length > 4096) throw new Error("Invalid LLM probe input");
      const result = infer(InferencingModels.Llama2Chat, prompt, { maxTokens: 8 });
      const embedding = generateEmbeddings(EmbeddingModels.AllMiniLmL6V2, [prompt]);
      return { text: result.text, generatedTokens: result.usage.generatedTokenCount, embeddingDimensions: embedding.embeddings[0]?.length ?? 0 };
    }
    case "mysql": {
      const address = getVariable("mysql_url");
      if (!address) return { notConfigured: "mysql_url" };
      const result = openMySql(address).query("SELECT 1 AS value", []);
      return { value: Number(result.rows[0]?.value) };
    }
    case "postgres": {
      const address = getVariable("postgres_url");
      if (!address) return { notConfigured: "postgres_url" };
      const result = openPostgres(address).query("SELECT 1 AS value", []);
      return { value: Number(result.rows[0]?.value) };
    }
    case "redis": {
      const address = getVariable("redis_url");
      if (!address) return { notConfigured: "redis_url" };
      return { result: openRedis(address).execute("PING", []) };
    }
    case "http": {
      const response = await fetch("https://example.com");
      return { upstreamStatus: response.status };
    }
    default:
      return null;
  }
}

export async function handler(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  if (path === "/api/typescript" && request.method === "GET") {
    return jsonResponse({ language, runtime: "WASI Preview 2", apis });
  }
  const prefix = "/api/typescript/probe/";
  if (!path.startsWith(prefix)) return jsonResponse({ error: "Not found" }, 404);
  if (!authorized(request)) return jsonResponse({ error: "Unauthorized" }, 401);
  const api = path.slice(prefix.length);
  if (!apis.includes(api)) return jsonResponse({ error: "Unknown API probe" }, 404);
  if ((api === "llm" && request.method !== "POST") || (api !== "llm" && request.method !== "GET")) {
    return new Response(null, { status: 405, headers: { allow: api === "llm" ? "POST" : "GET" } });
  }
  try {
    console.log(`component=typescript api_probe=${api}`);
    return jsonResponse({ language, api, result: await probe(api, request) });
  } catch {
    console.error(`component=typescript api_probe_failed=${api}`);
    return jsonResponse({ error: "Spin API probe failed", api }, 503);
  }
}

interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response>): void;
}

addEventListener("fetch", (event) => {
  (event as FetchEvent).respondWith(handler((event as FetchEvent).request));
});