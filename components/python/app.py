import hmac
import json

from spin_sdk import key_value, variables
from spin_sdk.http import IncomingHandler as BaseHandler, Request, Response


class IncomingHandler(BaseHandler):
    def handle_request(self, request: Request) -> Response:
        if request.method != "GET":
            return Response(405, {"allow": "GET"}, b"")
        path = request.uri.split("?", 1)[0].rstrip("/")
        if path.endswith("/kv"):
            token = variables.get("api_token")
            provided = dict(request.headers).get("authorization", "")
            if len(token) < 24 or not hmac.compare_digest(
                provided.encode(), ("Bearer " + token).encode()
            ):
                return Response(401, {}, b"")
            try:
                value = key_value.open_default().get("sample")
                result = {"language": "Python", "value": value.decode("utf-8", errors="replace") if value is not None else None}
            except Exception:
                print("component=python event=kv_failed")
                return Response(503, {}, b"")
        elif path.endswith("/api/python"):
            result = {"language": "Python", "runtime": "WASI Preview 2"}
        else:
            return Response(404, {}, b"")
        print("component=python event=request")
        return Response(200, {"content-type": "application/json", "cache-control": "no-store"}, json.dumps(result).encode())