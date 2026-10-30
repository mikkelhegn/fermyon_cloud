use spin_sdk::http::{IntoResponse, Method, Request, Response};
use spin_sdk::{http_component, key_value, llm, mysql, pg, redis, sqlite, variables};

mod composed {
    wit_bindgen::generate!({ path: "../formatter/wit", world: "consumer", generate_all });
}

#[http_component]
fn handle(request: Request) -> anyhow::Result<impl IntoResponse> {
    match dispatch(&request) {
        Ok(response) => Ok(response),
        Err(_) => {
            eprintln!("component=rust event=operation_failed");
            Ok(json_response(
                503,
                serde_json::json!({"error": "Operation failed; check resource links, configuration, and provider availability"}),
            ))
        }
    }
}

fn json_response(status: u16, body: serde_json::Value) -> Response {
    Response::builder()
        .status(status)
        .header("content-type", "application/json")
        .header("cache-control", "no-store")
        .body(body.to_string())
        .build()
}

fn dispatch(request: &Request) -> anyhow::Result<Response> {
    let path = request.path();
    println!("component=rust method={} path={path}", request.method());
    if path == "/" || path == "/healthz" {
        return Ok(json_response(
            200,
            serde_json::json!({"application": "cloud-language-lab", "status": "ok", "languages": ["rust", "javascript", "typescript", "python", "go", "c", "cpp", "csharp", "fsharp", "grain", "ruby", "swift", "zig", "php"]}),
        ));
    }
    if path != "/api/rust" {
        let token = variables::get("api_token")?;
        if token.len() < 24 {
            return Ok(json_response(
                503,
                serde_json::json!({"error": "Configure an api_token of at least 24 characters"}),
            ));
        }
        let expected = format!("Bearer {token}");
        let provided = request
            .header("authorization")
            .and_then(|value| value.as_str())
            .unwrap_or("");
        if !tokens_equal(provided.as_bytes(), expected.as_bytes()) {
            return Ok(json_response(
                401,
                serde_json::json!({"error": "Unauthorized"}),
            ));
        }
    }
    if request.body().len() > 65536 {
        return Ok(json_response(
            413,
            serde_json::json!({"error": "Body exceeds 64 KiB"}),
        ));
    }
    let result = match (request.method(), path) {
        (&Method::Get, "/api/rust") => serde_json::json!({
            "language": "Rust",
            "greeting": variables::get("greeting")?,
            "composed_greeting": composed::lab::greeting::formatter::greet("Rust"),
            "features": ["variables", "key-value", "sqlite", "outbound-http", "ai", "redis", "mysql", "postgres", "component-dependencies", "wasi-config", "wasi-keyvalue"]
        }),
        (&Method::Get, "/api/rust/kv") => {
            let store = key_value::Store::open_default()?;
            serde_json::json!({"value": store.get("sample")?.map(|value| String::from_utf8_lossy(&value).into_owned())})
        }
        (&Method::Get, "/api/rust/wasi-config") => {
            let greeting = composed::wasi::config::store::get("greeting")?;
            serde_json::json!({"greeting": greeting, "interface": "wasi:config/store@0.2.0-draft-2024-09-27"})
        }
        (&Method::Get, "/api/rust/wasi-keyvalue") => {
            let bucket = composed::wasi::keyvalue::store::open("default")?;
            let value = bucket
                .get("sample")?
                .map(|value| String::from_utf8_lossy(&value).into_owned());
            serde_json::json!({"value": value, "interface": "wasi:keyvalue/store@0.2.0-draft2"})
        }
        (&Method::Put, "/api/rust/kv") => {
            key_value::Store::open_default()?.set("sample", request.body())?;
            serde_json::json!({"stored": true})
        }
        (&Method::Delete, "/api/rust/kv") => {
            key_value::Store::open_default()?.delete("sample")?;
            serde_json::json!({"deleted": true})
        }
        (&Method::Get, "/api/rust/sqlite") => {
            let connection = sqlite::Connection::open_default()?;
            connection.execute(
                "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL)",
                &[],
            )?;
            let result =
                connection.execute("SELECT id, body FROM notes ORDER BY id DESC LIMIT 20", &[])?;
            let notes: Vec<_> = result.rows().map(|row| serde_json::json!({"id": row.get::<i64>("id"), "body": row.get::<&str>("body")})).collect();
            serde_json::json!({"notes": notes})
        }
        (&Method::Post, "/api/rust/sqlite") => {
            let text = match std::str::from_utf8(request.body()) {
                Ok(text) if !text.trim().is_empty() => text,
                _ => {
                    return Ok(json_response(
                        400,
                        serde_json::json!({"error": "Expected nonempty UTF-8 text"}),
                    ))
                }
            };
            let connection = sqlite::Connection::open_default()?;
            connection.execute(
                "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL)",
                &[],
            )?;
            connection.execute(
                "INSERT INTO notes (body) VALUES (?)",
                &[sqlite::Value::Text(text.to_owned())],
            )?;
            serde_json::json!({"inserted": true})
        }
        (&Method::Get, "/api/rust/http") => {
            let response: Response = spin_sdk::http::run(spin_sdk::http::send(
                Request::get("https://example.com").build(),
            ))?;
            serde_json::json!({"upstream_status": response.status()})
        }
        (&Method::Post, "/api/rust/ai/infer")
        | (&Method::Post, "/api/rust/ai/code")
        | (&Method::Post, "/api/rust/ai/embed") => {
            let text = match std::str::from_utf8(request.body()) {
                Ok(text) if !text.trim().is_empty() && text.len() <= 4096 => text,
                _ => {
                    return Ok(json_response(
                        400,
                        serde_json::json!({"error": "Expected 1-4096 bytes of UTF-8 text"}),
                    ))
                }
            };
            if path.ends_with("/embed") {
                let result = llm::generate_embeddings(
                    llm::EmbeddingModel::AllMiniLmL6V2,
                    &[text.to_owned()],
                )?;
                serde_json::json!({"embeddings": result.embeddings, "prompt_tokens": result.usage.prompt_token_count})
            } else {
                let model = if path.ends_with("/code") {
                    llm::InferencingModel::CodellamaInstruct
                } else {
                    llm::InferencingModel::Llama2Chat
                };
                let result = llm::infer_with_options(
                    model,
                    text,
                    llm::InferencingParams {
                        max_tokens: 128,
                        ..Default::default()
                    },
                )?;
                serde_json::json!({"text": result.text, "prompt_tokens": result.usage.prompt_token_count, "generated_tokens": result.usage.generated_token_count})
            }
        }
        (&Method::Get, "/api/rust/redis") => {
            let address = variables::get("redis_url")?;
            if address.is_empty() {
                return Ok(not_configured("redis_url"));
            }
            let connection = redis::Connection::open(&address)?;
            connection.execute("PING", &[])?;
            serde_json::json!({"redis": "ok"})
        }
        (&Method::Get, "/api/rust/mysql") => {
            let address = variables::get("mysql_url")?;
            if address.is_empty() {
                return Ok(not_configured("mysql_url"));
            }
            let result = mysql::Connection::open(&address)?.query("SELECT 1", &[])?;
            serde_json::json!({"mysql": "ok", "rows": result.rows.len()})
        }
        (&Method::Get, "/api/rust/postgres") => {
            let address = variables::get("postgres_url")?;
            if address.is_empty() {
                return Ok(not_configured("postgres_url"));
            }
            let result = pg::Connection::open(&address)?.query("SELECT 1", &[])?;
            serde_json::json!({"postgres": "ok", "rows": result.rows.len()})
        }
        _ => {
            return Ok(json_response(
                404,
                serde_json::json!({"error": "Unknown route or method"}),
            ))
        }
    };
    Ok(json_response(200, result))
}

fn not_configured(variable: &str) -> Response {
    json_response(
        503,
        serde_json::json!({"error": "External service not configured", "variable": variable}),
    )
}

fn tokens_equal(provided: &[u8], expected: &[u8]) -> bool {
    if provided.len() != expected.len() {
        return false;
    }
    provided
        .iter()
        .zip(expected)
        .fold(0u8, |difference, (left, right)| difference | (left ^ right))
        == 0
}
