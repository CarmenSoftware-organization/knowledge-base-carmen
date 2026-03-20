package config

import (
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
	Translation TranslationConfig
	OpenRouter  OpenRouterConfig
}

type OpenRouterConfig struct {
	APIKey     string
	EmbedModel string
}

// TranslationConfig holds config for Google Cloud Translation API (wiki content).
type TranslationConfig struct {
	APIKey  string // GOOGLE_TRANSLATE_API_KEY
	Enabled bool   // TRANSLATION_ENABLED
}

type ServerConfig struct {
	Port         string
	Host         string
	ChatbotURL   string
	Environment  string
	CORSOrigins  string
	AdminAPIKey  string // ADMIN_API_KEY — required to access /api/chat/history/list
	PrivacySecret string // PRIVACY_HMAC_SECRET — HMAC key for hashing user_id
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
	RepoPath          string
	RepoURL           string
	ContentPath       string
	ChunkSize         int
	ChunkOverlap      int
	SyncBranch        string   // branch สำหรับ wiki sync (GIT_SYNC_BRANCH)
	DefaultBU         string   // BU เมื่อ schema ไม่ valid (WIKI_DEFAULT_BU)
	CarmenContentDirs []string // paths ที่ลองสำหรับ carmen (WIKI_CARMEN_PATHS)
	CarmenGitPath     string   // prefix ใน GitHub สำหรับ carmen (WIKI_CARMEN_GIT_PATH)
}

// WikiSearchConfig holds configurable values for wiki search (avoids hardcoding).
type WikiSearchConfig struct {
	SearchLimit       int     // WIKI_SEARCH_LIMIT
	VectorDistanceMax float64 // WIKI_VECTOR_DISTANCE_MAX
	SnippetMaxLen     int     // WIKI_SNIPPET_MAX_LEN
}

// ChatConfig holds configurable values for chat context (avoids hardcoding).
type ChatConfig struct {
	ContextLimit               int     // CHAT_CONTEXT_LIMIT
	MaxContextChars            int     // CHAT_MAX_CONTEXT_CHARS
	MaxChunkContent            int     // CHAT_MAX_CHUNK_CONTENT
	HistoryEnabled             bool    // CHAT_HISTORY_ENABLED
	HistorySimilarityThreshold float64 // CHAT_HISTORY_SIMILARITY_THRESHOLD
}

var AppConfig *Config

// Default values (ใช้เมื่อ env ไม่ได้ตั้ง — แก้ได้ผ่าน env)
const (
	defaultRepoPath      = "./wiki-content"
	defaultBU            = "carmen"
	defaultCarmenPaths   = "../carmen_cloud,./carmen_cloud"
	defaultCarmenGitPath = "carmen_cloud"
	defaultGitSyncBranch = "wiki-content"
)

// DefaultRepoPath returns the default wiki repo path when config is empty.
func DefaultRepoPath() string { return defaultRepoPath }

// DefaultGitSyncBranch returns the default branch for wiki sync.
func DefaultGitSyncBranch() string { return defaultGitSyncBranch }

func Load() error {
	cwd, _ := os.Getwd()
	_ = godotenv.Overload(filepath.Join(cwd, ".env"))
	// Try multiple paths so .env is found whether running from repo root, backend/, or backend/tmp/
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("backend/.env")
	if execPath, err := os.Executable(); err == nil {
		execDir := filepath.Dir(execPath)
		_ = godotenv.Load(filepath.Join(execDir, ".env"))
		_ = godotenv.Load(filepath.Join(execDir, "..", ".env"))
	}

	AppConfig = &Config{
		Server: ServerConfig{
			Port:          getEnv("SERVER_PORT", "8080"),
			Host:          getEnv("SERVER_HOST", "localhost"),
			ChatbotURL:    getEnv("PYTHON_CHATBOT_URL", "http://localhost:8000"),
			Environment:   getEnv("ENVIRONMENT", "development"),
			CORSOrigins:   getEnv("CORS_ORIGINS", "*"),
			AdminAPIKey:   getEnv("ADMIN_API_KEY", ""),
			PrivacySecret: getEnv("PRIVACY_HMAC_SECRET", "carmen-privacy-default"),
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
			RepoPath:          getEnv("GIT_REPO_PATH", defaultRepoPath),
			RepoURL:           getEnv("GIT_REPO_URL", ""),
			ContentPath:       getEnv("WIKI_CONTENT_PATH", ""),
			ChunkSize:         getEnvAsInt("WIKI_CHUNK_SIZE", 500),
			ChunkOverlap:      getEnvAsInt("WIKI_CHUNK_OVERLAP", 100),
			SyncBranch:        getEnv("GIT_SYNC_BRANCH", getEnv("GITHUB_BRANCH", defaultGitSyncBranch)),
			DefaultBU:         getEnv("WIKI_DEFAULT_BU", defaultBU),
			CarmenContentDirs: getEnvAsStringSlice("WIKI_CARMEN_PATHS", defaultCarmenPaths),
			CarmenGitPath:     getEnv("WIKI_CARMEN_GIT_PATH", defaultCarmenGitPath),
		},
		WikiSearch: WikiSearchConfig{
			SearchLimit:       getEnvAsInt("WIKI_SEARCH_LIMIT", 20),
			VectorDistanceMax: getEnvAsFloat("WIKI_VECTOR_DISTANCE_MAX", 0.3),
			SnippetMaxLen:     getEnvAsInt("WIKI_SNIPPET_MAX_LEN", 200),
		},
		Chat: ChatConfig{
			ContextLimit:               getEnvAsInt("CHAT_CONTEXT_LIMIT", 10),
			MaxContextChars:            getEnvAsInt("CHAT_MAX_CONTEXT_CHARS", 8000),
			MaxChunkContent:            getEnvAsInt("CHAT_MAX_CHUNK_CONTENT", 2000),
			HistoryEnabled:             getEnvAsBool("CHAT_HISTORY_ENABLED", true),
			HistorySimilarityThreshold: getEnvAsFloat("CHAT_HISTORY_SIMILARITY_THRESHOLD", 0.15),
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
		Translation: TranslationConfig{
			APIKey:  getEnv("GOOGLE_TRANSLATE_API_KEY", ""),
			Enabled: getEnvAsBool("TRANSLATION_ENABLED", true),
		},
		OpenRouter: OpenRouterConfig{
			APIKey:     getEnv("OPENROUTER_API_KEY", ""),
			EmbedModel: getEnv("OPENROUTER_EMBED_MODEL", "qwen/qwen3-embedding-8b"),
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
		return defaultRepoPath
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

func getEnvAsStringSlice(key, defaultCSV string) []string {
	val := getEnv(key, defaultCSV)
	if val == "" {
		val = defaultCSV
	}
	var out []string
	for _, s := range strings.Split(val, ",") {
		if t := strings.TrimSpace(s); t != "" {
			out = append(out, t)
		}
	}
	return out
}
