using Fermyon.Spin.Sdk;
using System.Security.Cryptography;
using System.Text.Json;

public static class Handler
{
    private static readonly string[] Apis = ["variables", "http", "redis", "postgres"];

    private static readonly string[] Apis = new[] { "variables", "http", "redis", "postgres" };

    [HttpHandler]
    public static HttpResponse HandleHttpRequest(HttpRequest request)
    {
        Console.WriteLine("component=csharp event=request");
        var path = request.Url.TrimEnd('/');
        if (path == "/api/csharp")
        {
            return request.Method == HttpMethod.Get
                ? JsonResponse(200, new { language = "C#", runtime = "experimental Spin .NET SDK", apis = Apis })
                : JsonResponse(405, new { error = "Method not allowed" });
        }
        const string prefix = "/api/csharp/probe/";
        if (!path.StartsWith(prefix, StringComparison.Ordinal))
        {
            return JsonResponse(404, new { error = "Not found" });
        }

        var token = SpinConfig.Get("api_token");
        request.Headers.TryGetValue("authorization", out var provided);
        var expectedBytes = System.Text.Encoding.UTF8.GetBytes($"Bearer {token}");
        var providedBytes = System.Text.Encoding.UTF8.GetBytes(provided ?? "");
        if (token.Length < 24 || expectedBytes.Length != providedBytes.Length || !CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes))
        {
            return JsonResponse(401, new { error = "Unauthorized" });
        }

        var api = path[prefix.Length..];
        if (!Apis.Contains(api, StringComparer.Ordinal))
        {
            return JsonResponse(404, new { error = "Unknown API probe" });
        }
        if (request.Method != HttpMethod.Get)
        {
            return JsonResponse(405, new { error = "Method not allowed" });
        }

        try
        {
            var result = api switch
            {
                "variables" => (object)new { greeting = SpinConfig.Get("greeting") },
                "http" => ProbeHttp(),
                                "http" => ProbeHttp(),
                "redis" => ProbeRedis(),
                "postgres" => ProbePostgres(),
                _ => throw new InvalidOperationException("Unknown API probe"),
            };
            return JsonResponse(200, new { language = "C#", api, result });
        }
        catch
        {
            Console.Error.WriteLine($"component=csharp api_probe_failed={api}");
            return JsonResponse(503, new { error = "Spin API probe failed", api });
        }
    }

    private static object ProbeHttp()
    {
        var response = HttpOutbound.Send(new HttpRequest
        {
            Method = Fermyon.Spin.Sdk.HttpMethod.Get,
            Url = "https://example.com",
        });
        return new { upstreamStatus = (int)response.StatusCode };
    }

    private static object ProbeRedis()
    {
        var address = SpinConfig.Get("redis_url");
        if (string.IsNullOrEmpty(address)) throw new InvalidOperationException("redis_url is not configured");
        const string key = "cloud-language-lab:probe:csharp";
        RedisOutbound.Set(address, key, Buffer.FromString("ready"));
        return new { value = RedisOutbound.Get(address, key).ToUTF8String() };
    }

    private static object ProbePostgres()
    {
        var address = SpinConfig.Get("postgres_url");
        if (string.IsNullOrEmpty(address)) throw new InvalidOperationException("postgres_url is not configured");
        var result = PostgresOutbound.Query(address, "SELECT 1 AS value");
        return new { rows = result.Rows.Count };
    }

    private static HttpResponse JsonResponse(int statusCode, object body)
    {
        return new HttpResponse
        {
            StatusCode = (System.Net.HttpStatusCode)statusCode,
            Headers = new Dictionary<string, string> { { "Content-Type", "application/json" } },
            BodyAsString = JsonSerializer.Serialize(body),
        };
    }
}