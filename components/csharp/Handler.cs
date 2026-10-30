using Fermyon.Spin.Sdk;

public static class Handler
{
    [HttpHandler]
    public static HttpResponse HandleHttpRequest(HttpRequest request)
    {
        Console.WriteLine("component=csharp event=request");
        return new HttpResponse
        {
            StatusCode = System.Net.HttpStatusCode.OK,
            Headers = new Dictionary<string, string> { { "Content-Type", "application/json" } },
            BodyAsString = "{\"language\":\"C#\",\"runtime\":\"experimental Spin .NET SDK\"}"
        };
    }
}