package config

import (
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Server      ServerConfig
	Database    DatabaseConfig
	JWT         JWTConfig
	Ollama      OllamaConfig
	GitHub      GitHubConfig
	Git         GitConfig
	WikiSearch  WikiSearchConfig
	Chat        ChatConfig
	OpenClaw    OpenClawConfig
	Make        MakeConfig
}

type ServerConfig struct {
	Port         string
	Host         string
	ChatbotURL   string
	Environment  string
	CORSOrigins  string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
	Schema   string
}

type JWTConfig struct {
	Secret string
	Expiry string
}

type OllamaConfig struct {
	URL                string
	ChatModel          string
	EmbedModel         string
	VectorDimension    int
	InsecureSkipVerify bool
}

type OpenClawConfig struct {
	URL     string
	Token   string
	Model   string
	Enabled bool
}

type MakeConfig struct {
	WebhookURL           string
	WebhookAPIKey        string
	UseForQuestionRouter bool
}

type GitHubConfig struct {
	Token         string
	Owner         string
	Repo          string
	Branch        string
	WebhookSecret string
	WebhookBranch string
}

type GitConfig struct {
	RepoPath     string
	RepoURL      string
	ContentPath  string
	ChunkSize    int
	ChunkOverlap int
}

// WikiSearchConfig holds configurable values for wiki search (avoids hardcoding).
type WikiSearchConfig struct {
	SearchLimit       int     // WIKI_SEARCH_LIMIT
	VectorDistanceMax float64 // WIKI_VECTOR_DISTANCE_MAX
	SnippetMaxLen     int     // WIKI_SNIPPET_MAX_LEN
}

// ChatConfig holds configurable values for chat context (avoids hardcoding).
type ChatConfig struct {
	ContextLimit      int // CHAT_CONTEXT_LIMIT
	MaxContextChars   int // CHAT_MAX_CONTEXT_CHARS
	MaxChunkContent   int // CHAT_MAX_CHUNK_CONTENT
}

var AppConfig *Config

func Load() error {
	if err := godotenv.Load(".env"); err != nil {
		if err2 := godotenv.Load("../.env"); err2 != nil {
			log.Println("No .env file found, using environment variables")
		}
	}

	AppConfig = &Config{
		Server: ServerConfig{
			Port:         getEnv("SERVER_PORT", "8080"),
			Host:         getEnv("SERVER_HOST", "localhost"),
			ChatbotURL:   getEnv("PYTHON_CHATBOT_URL", "http://localhost:8000"),
			Environment:  getEnv("ENVIRONMENT", "development"),
			CORSOrigins:  getEnv("CORS_ORIGINS", "*"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			Name:     getEnv("DB_NAME", "carmen_db"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
			Schema:   getEnv("DB_SCHEMA", "public"),
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", "change-me-in-production"),
			Expiry: getEnv("JWT_EXPIRY", "24h"),
		},
		Ollama: OllamaConfig{
			URL:                getEnv("OLLAMA_URL", "http://localhost:11434"),
			ChatModel:          getEnv("OLLAMA_CHAT_MODEL", getEnv("OLLAMA_MODEL", "llama2")),
			EmbedModel:         getEnv("OLLAMA_EMBED_MODEL", getEnv("OLLAMA_MODEL", "llama2")),
			VectorDimension:    getEnvAsInt("VECTOR_DIMENSION", 1536),
			InsecureSkipVerify: getEnvAsBool("OLLAMA_INSECURE_SKIP_VERIFY", false),
		},
		GitHub: GitHubConfig{
			Token:         getEnv("GITHUB_TOKEN", ""),
			Owner:         getEnv("GITHUB_REPO_OWNER", ""),
			Repo:          getEnv("GITHUB_REPO_NAME", ""),
			Branch:        getEnv("GITHUB_BRANCH", "main"),
			WebhookSecret: getEnv("GITHUB_WEBHOOK_SECRET", ""),
			WebhookBranch: getEnv("GITHUB_WEBHOOK_BRANCH", getEnv("GITHUB_BRANCH", "main")),
		},
		Git: GitConfig{
			RepoPath:     getEnv("GIT_REPO_PATH", "./wiki-content"),
			RepoURL:      getEnv("GIT_REPO_URL", ""),
			ContentPath:  getEnv("WIKI_CONTENT_PATH", ""),
			ChunkSize:    getEnvAsInt("WIKI_CHUNK_SIZE", 500),
			ChunkOverlap: getEnvAsInt("WIKI_CHUNK_OVERLAP", 100),
		},
		WikiSearch: WikiSearchConfig{
			SearchLimit:       getEnvAsInt("WIKI_SEARCH_LIMIT", 20),
			VectorDistanceMax: getEnvAsFloat("WIKI_VECTOR_DISTANCE_MAX", 0.3),
			SnippetMaxLen:     getEnvAsInt("WIKI_SNIPPET_MAX_LEN", 200),
		},
		Chat: ChatConfig{
			ContextLimit:    getEnvAsInt("CHAT_CONTEXT_LIMIT", 10),
			MaxContextChars: getEnvAsInt("CHAT_MAX_CONTEXT_CHARS", 8000),
			MaxChunkContent: getEnvAsInt("CHAT_MAX_CHUNK_CONTENT", 2000),
		},
		OpenClaw: OpenClawConfig{
			URL:     getEnv("OPENCLAW_URL", ""),
			Token:   getEnv("OPENCLAW_TOKEN", ""),
			Model:   getEnv("OPENCLAW_MODEL", ""),
			Enabled: getEnvAsBool("OPENCLAW_ENABLED", false),
		},
		Make: MakeConfig{
			WebhookURL:           getEnv("MAKE_WEBHOOK_URL", ""),
			WebhookAPIKey:        getEnv("MAKE_WEBHOOK_API_KEY", ""),
			UseForQuestionRouter: getEnvAsBool("MAKE_USE_FOR_ROUTER", false),
		},
	}

	return nil
}

func GetWikiContentPath() string {
	c := AppConfig.Git
	var basePath string

	if c.ContentPath != "" {
		return NormalizePath(c.ContentPath)
	}
	if c.RepoPath != "" {
		return NormalizePath(c.RepoPath)
	}

	return NormalizePath(basePath)
}

// NormalizePath cleans and normalizes a path (used for wiki content paths).
func NormalizePath(path string) string {
	if path == "" {
		return "./wiki-content"
	}
	if filepath.IsAbs(path) {
		return filepath.Clean(path)
	}
	clean := filepath.Clean(path)
	if !strings.HasPrefix(clean, ".") {
		return "./" + clean
	}
	return clean
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value, err := strconv.Atoi(getEnv(key, "")); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value, err := strconv.ParseBool(getEnv(key, "")); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsFloat(key string, defaultValue float64) float64 {
	if value, err := strconv.ParseFloat(getEnv(key, ""), 64); err == nil {
		return value
	}
	return defaultValue
}
