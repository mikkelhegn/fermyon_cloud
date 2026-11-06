package main

import (
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/spinframework/spin-go-sdk/v2/kv"
	"github.com/spinframework/spin-go-sdk/v2/llm"
	"github.com/spinframework/spin-go-sdk/v2/mysql"
	"github.com/spinframework/spin-go-sdk/v2/pg"
	"github.com/spinframework/spin-go-sdk/v2/redis"
	"github.com/spinframework/spin-go-sdk/v2/sqlite"

	spinhttp "github.com/spinframework/spin-go-sdk/v2/http"
	"github.com/spinframework/spin-go-sdk/v2/variables"
)

var apis = []string{"variables", "kv", "sqlite", "llm", "mysql", "postgres", "redis"}

func writeJSON(writer http.ResponseWriter, status int, value any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.Header().Set("Cache-Control", "no-store")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(value)
}

func handleAPI(writer http.ResponseWriter, request *http.Request) {
	path := strings.TrimSuffix(request.URL.Path, "/")
	if path == "/api/go" {
		if request.Method != http.MethodGet {
			writer.Header().Set("Allow", "GET")
			writer.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{"language": "Go", "runtime": "TinyGo / WASI Preview 1", "apis": apis})
		return
	}
	const prefix = "/api/go/probe/"
	if !strings.HasPrefix(path, prefix) {
		writeJSON(writer, http.StatusNotFound, map[string]string{"error": "Not found"})
		return
	}
	api := strings.TrimPrefix(path, prefix)
	expectedMethod := http.MethodGet
	if api == "llm" {
		expectedMethod = http.MethodPost
	}
	if request.Method != expectedMethod {
		writer.Header().Set("Allow", expectedMethod)
		writer.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	token, err := variables.Get("api_token")
	provided := []byte(request.Header.Get("Authorization"))
	expected := []byte("Bearer " + token)
	if err != nil || len(token) < 24 || subtle.ConstantTimeCompare(provided, expected) != 1 {
		writeJSON(writer, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}
	prompt := ""
	if api == "llm" {
		body, readErr := io.ReadAll(io.LimitReader(request.Body, 4097))
		if readErr != nil || len(body) == 0 || len(body) > 4096 {
			writeJSON(writer, http.StatusBadRequest, map[string]string{"error": "Expected 1-4096 bytes of prompt text"})
			return
		}
		prompt = string(body)
	}
	result, err := probe(api, prompt)
	if err != nil {
		fmt.Printf("component=go api_probe_failed=%s\n", api)
		writeJSON(writer, http.StatusServiceUnavailable, map[string]string{"error": "Spin API probe failed", "api": api})
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"language": "Go", "api": api, "result": result})
}

func probe(api, prompt string) (any, error) {
	switch api {
	case "variables":
		return map[string]string{"greeting": mustVariable("greeting")}, nil
	case "kv":
		store, err := kv.OpenStore("default")
		if err != nil {
			return nil, err
		}
		defer store.Close()
		exists, err := store.Exists("sample")
		if err != nil || !exists {
			return map[string]any{"value": nil}, err
		}
		value, err := store.Get("sample")
		return map[string]string{"value": string(value)}, err
	case "sqlite":
		database := sqlite.Open("default")
		defer database.Close()
		var value int
		err := database.QueryRow("SELECT 1").Scan(&value)
		return map[string]int{"value": value}, err
	case "llm":
		result, err := llm.Infer("llama2-chat", prompt, &llm.InferencingParams{MaxTokens: 8})
		if err != nil {
			return nil, err
		}
		embedding, err := llm.GenerateEmbeddings("all-minilm-l6-v2", []string{prompt})
		if err != nil {
			return nil, err
		}
		dimensions := 0
		if len(embedding.Embeddings) > 0 {
			dimensions = len(embedding.Embeddings[0])
		}
		return map[string]any{"text": result.Text, "generatedTokens": result.Usage.GeneratedTokenCount, "embeddingDimensions": dimensions}, nil
	case "mysql":
		address := mustVariable("mysql_url")
		if address == "" {
			return nil, fmt.Errorf("mysql_url is not configured")
		}
		database := mysql.Open(address)
		defer database.Close()
		var value int
		err := database.QueryRow("SELECT 1").Scan(&value)
		return map[string]int{"value": value}, err
	case "postgres":
		address := mustVariable("postgres_url")
		if address == "" {
			return nil, fmt.Errorf("postgres_url is not configured")
		}
		database := pg.Open(address)
		defer database.Close()
		var value int
		err := database.QueryRow("SELECT 1").Scan(&value)
		return map[string]int{"value": value}, err
	case "redis":
		address := mustVariable("redis_url")
		if address == "" {
			return nil, fmt.Errorf("redis_url is not configured")
		}
		results, err := redis.NewClient(address).Execute("PING")
		if err != nil {
			return nil, err
		}
		if len(results) == 0 {
			return nil, fmt.Errorf("empty Redis response")
		}
		return map[string]string{"response": fmt.Sprint(results[0].Val)}, nil
	default:
		return nil, fmt.Errorf("unknown API probe")
	}
}

func mustVariable(name string) string {
	value, _ := variables.Get(name)
	return value
}

func init() {
	spinhttp.Handle(func(writer http.ResponseWriter, request *http.Request) {
		fmt.Println("component=go event=request")
		handleAPI(writer, request)
	})
}

func main() {}