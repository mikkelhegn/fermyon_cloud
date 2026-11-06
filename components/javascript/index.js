import { openDefault as openKeyValue } from "@spinframework/spin-kv";
import { EmbeddingModels, generateEmbeddings, infer, InferencingModels } from "@spinframework/spin-llm";
import { open as openMySql } from "@spinframework/spin-mysql";
import { open as openPostgres } from "@spinframework/spin-postgres";
import { open as openRedis } from "@spinframework/spin-redis";
import { openDefault as openSqlite } from "@spinframework/spin-sqlite";
import { get as getVariable } from "@spinframework/spin-variables";
import { createHandler } from "./handler.js";

const language = "JavaScript";
const runtime = "WASI Preview 2";
const apis = ["variables", "kv", "sqlite", "llm", "mysql", "postgres", "redis", "http"];

async function probe(api, request) {
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

export const handler = createHandler({ language, runtime, apis, getVariable, probe });

addEventListener("fetch", (event) => event.respondWith(handler(event.request)));