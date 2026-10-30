package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	spinhttp "github.com/spinframework/spin-go-sdk/v2/http"
)

func init() {
	spinhttp.Handle(func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet {
			writer.Header().Set("Allow", "GET")
			writer.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		fmt.Println("component=go event=request")
		writer.Header().Set("Content-Type", "application/json")
		json.NewEncoder(writer).Encode(map[string]string{"language": "Go", "runtime": "TinyGo / WASI Preview 1"})
	})
}

func main() {}