package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
	"github.com/new-carmen/backend/internal/constants"
)

type Config struct {
	Server      ServerConfig
	Database    DatabaseConfig
	JWT         JWTConfig
	GitHub      GitHubConfig
	Git         GitConfig
	WikiSearch  WikiSearchConfig
	Chat        ChatConfig
	OpenClaw    OpenClawConfig
	Make        MakeConfig
	Translation TranslationConfig
	LLM         LLMConfig
}

type LLMConfig struct {
	APIKey     string
	APIBase    string
	ChatModel  string
	EmbedModel string
	TimeoutSec int
}

type TranslationConfig struct {
	APIKey     string
	Enabled    bool
	APIBaseURL string
	TimeoutSec int
}

type ServerConfig struct {
	Port           string
	Host           string
	ChatbotURL     string
	Environment    string
	StrictEnvOnly  bool
	CORSOrigins    string
	AdminAPIKey    string
	InternalAPIKey string
	PrivacySecret  string
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
	RepoBaseURL   string
	APIBaseURL    string
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
	SyncBranch        string
	DefaultBU         string
	CarmenContentDirs []string
	CarmenGitPath     string
}

type WikiSearchConfig struct {
	SearchLimit       int
	VectorDistanceMax float64
	SnippetMaxLen     int
}

type ChatConfig struct {
	ContextLimit               int
	MaxContextChars            int
	MaxChunkContent            int
	HistoryEnabled             bool
	HistorySimilarityThreshold float64
	IndexingTimeoutMin         int
	WebhookIndexTimeoutMin     int
}

var AppConfig *Config

const (
	defaultRepoPath      = "./wiki-content"
	defaultBU            = constants.DefaultBU
	defaultCarmenPaths   = "../carmen_cloud,./carmen_cloud"
	defaultCarmenGitPath = "carmen_cloud"
	defaultGitSyncBranch = "wiki-content"
	defaultGitHubRepoURL = "https://github.com"
	defaultGitHubAPIURL  = "https://api.github.com"
	defaultTranslateURL  = "https://translation.googleapis.com/language/translate/v2"
)

func DefaultRepoPath() string { return defaultRepoPath }

func DefaultGitSyncBranch() string         { return defaultGitSyncBranch }
func DefaultGitHubRepoBaseURL() string     { return defaultGitHubRepoURL }
func DefaultGitHubAPIBaseURL() string      { return defaultGitHubAPIURL }
func DefaultTranslationAPIBaseURL() string { return defaultTranslateURL }

func Load() error {
	cwd, _ := os.Getwd()
	_ = godotenv.Load(filepath.Join(cwd, ".env"))
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("backend/.env")
	if execPath, err := os.Executable(); err == nil {
		execDir := filepath.Dir(execPath)
		_ = godotenv.Load(filepath.Join(execDir, ".env"))
		_ = godotenv.Load(filepath.Join(execDir, "..", ".env"))
	}
	strictEnvOnly := getEnvAsBool("STRICT_ENV_ONLY", false)
	if strictEnvOnly {
		if err := ensureStrictEnv(); err != nil {
			return err
		}
	}
	environment := getEnv("ENVIRONMENT", "development")
	isProd := strings.EqualFold(environment, "production")
	defaultCORS := "*"
	defaultSSLMode := "disable"
	if isProd {
		defaultCORS = ""
		defaultSSLMode = "require"
	}

	AppConfig = &Config{
		Server: ServerConfig{
			Port:           listenPort(),
			Host:           getEnv("SERVER_HOST", "localhost"),
			ChatbotURL:     getEnv("PYTHON_CHATBOT_URL", "http://localhost:8000"),
			Environment:    environment,
			StrictEnvOnly:  strictEnvOnly,
			CORSOrigins:    getEnv("CORS_ORIGINS", defaultCORS),
			AdminAPIKey:    getEnv("ADMIN_API_KEY", ""),
			InternalAPIKey: getEnv("INTERNAL_API_KEY", ""),
			PrivacySecret:  getEnv("PRIVACY_HMAC_SECRET", ""),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
			Name:     getEnv("DB_NAME", "carmen_db"),
			SSLMode:  getEnv("DB_SSLMODE", defaultSSLMode),
			Schema:   getEnv("DB_SCHEMA", "public"),
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", ""),
			Expiry: getEnv("JWT_EXPIRY", "24h"),
		},
		GitHub: GitHubConfig{
			Token:         getEnv("GITHUB_TOKEN", ""),
			Owner:         getEnv("GITHUB_REPO_OWNER", ""),
			Repo:          getEnv("GITHUB_REPO_NAME", ""),
			RepoBaseURL:   getEnv("GITHUB_REPO_BASE_URL", defaultGitHubRepoURL),
			APIBaseURL:    getEnv("GITHUB_API_BASE_URL", defaultGitHubAPIURL),
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
			IndexingTimeoutMin:         getEnvAsInt("INDEXING_TIMEOUT_MINUTES", 60),
			WebhookIndexTimeoutMin:     getEnvAsInt("WEBHOOK_INDEXING_TIMEOUT_MINUTES", 30),
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
			APIKey:     getEnv("GOOGLE_TRANSLATE_API_KEY", ""),
			Enabled:    getEnvAsBool("TRANSLATION_ENABLED", true),
			APIBaseURL: getEnv("TRANSLATION_API_BASE_URL", defaultTranslateURL),
			TimeoutSec: getEnvAsInt("TRANSLATION_TIMEOUT_SECONDS", 30),
		},
		LLM: LLMConfig{
			APIKey:     getEnvFirst([]string{"LLM_API_KEY", "OPENROUTER_API_KEY"}, ""),
			APIBase:    getEnv("LLM_API_BASE", "https://openrouter.ai/api/v1"),
			ChatModel:  getEnvFirst([]string{"LLM_CHAT_MODEL", "OPENROUTER_CHAT_MODEL"}, "openai/gpt-4o-mini"),
			EmbedModel: getEnvFirst([]string{"LLM_EMBED_MODEL", "OPENROUTER_EMBED_MODEL"}, "qwen/qwen3-embedding-8b"),
			TimeoutSec: getEnvAsInt("LLM_TIMEOUT_SECONDS", 60),
		},
	}

	return nil
}

func ensureStrictEnv() error {
	required := []string{
		"ENVIRONMENT",
		"SERVER_HOST",
		"SERVER_PORT",
		"PYTHON_CHATBOT_URL",
		"CORS_ORIGINS",
		"ADMIN_API_KEY",
		"INTERNAL_API_KEY",
		"PRIVACY_HMAC_SECRET",
		"DB_HOST",
		"DB_PORT",
		"DB_USER",
		"DB_PASSWORD",
		"DB_NAME",
		"DB_SSLMODE",
		"DB_SCHEMA",
		"JWT_SECRET",
		"JWT_EXPIRY",
		"VECTOR_DIMENSION",
		"GITHUB_TOKEN",
		"GITHUB_REPO_OWNER",
		"GITHUB_REPO_NAME",
		"GITHUB_REPO_BASE_URL",
		"GITHUB_API_BASE_URL",
		"GITHUB_BRANCH",
		"GITHUB_WEBHOOK_SECRET",
		"GITHUB_WEBHOOK_BRANCH",
		"GIT_REPO_PATH",
		"GIT_REPO_URL",
		"WIKI_CONTENT_PATH",
		"WIKI_CHUNK_SIZE",
		"WIKI_CHUNK_OVERLAP",
		"GIT_SYNC_BRANCH",
		"WIKI_DEFAULT_BU",
		"WIKI_CARMEN_PATHS",
		"WIKI_CARMEN_GIT_PATH",
		"WIKI_SEARCH_LIMIT",
		"WIKI_VECTOR_DISTANCE_MAX",
		"WIKI_SNIPPET_MAX_LEN",
		"CHAT_CONTEXT_LIMIT",
		"CHAT_MAX_CONTEXT_CHARS",
		"CHAT_MAX_CHUNK_CONTENT",
		"CHAT_HISTORY_ENABLED",
		"CHAT_HISTORY_SIMILARITY_THRESHOLD",
		"INDEXING_TIMEOUT_MINUTES",
		"WEBHOOK_INDEXING_TIMEOUT_MINUTES",
		"OPENCLAW_URL",
		"OPENCLAW_TOKEN",
		"OPENCLAW_MODEL",
		"OPENCLAW_ENABLED",
		"MAKE_WEBHOOK_URL",
		"MAKE_WEBHOOK_API_KEY",
		"MAKE_USE_FOR_ROUTER",
		"GOOGLE_TRANSLATE_API_KEY",
		"TRANSLATION_ENABLED",
		"TRANSLATION_API_BASE_URL",
		"TRANSLATION_TIMEOUT_SECONDS",
		"LLM_API_KEY",
		"OPENROUTER_API_KEY",
		"LLM_API_BASE",
		"LLM_CHAT_MODEL",
		"OPENROUTER_CHAT_MODEL",
		"LLM_EMBED_MODEL",
		"OPENROUTER_EMBED_MODEL",
		"LLM_TIMEOUT_SECONDS",
	}
	missing := make([]string, 0)
	for _, key := range required {
		if _, ok := os.LookupEnv(key); !ok {
			missing = append(missing, key)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("STRICT_ENV_ONLY=true but missing env keys: %s", strings.Join(missing, ", "))
	}
	return nil
}

func Validate() error {
	if AppConfig == nil {
		return fmt.Errorf("config not loaded")
	}
	if !strings.EqualFold(AppConfig.Server.Environment, "production") {
		return nil
	}
	if strings.TrimSpace(AppConfig.JWT.Secret) == "" {
		return fmt.Errorf("JWT_SECRET is required in production")
	}
	if strings.TrimSpace(AppConfig.Server.PrivacySecret) == "" {
		return fmt.Errorf("PRIVACY_HMAC_SECRET is required in production")
	}
	if strings.TrimSpace(AppConfig.Server.AdminAPIKey) == "" {
		return fmt.Errorf("ADMIN_API_KEY is required in production")
	}
	if strings.TrimSpace(AppConfig.Server.InternalAPIKey) == "" {
		return fmt.Errorf("INTERNAL_API_KEY is required in production")
	}
	if strings.TrimSpace(AppConfig.Database.Password) == "" {
		return fmt.Errorf("DB_PASSWORD is required in production")
	}
	if strings.TrimSpace(AppConfig.Server.CORSOrigins) == "" || strings.TrimSpace(AppConfig.Server.CORSOrigins) == "*" {
		return fmt.Errorf("CORS_ORIGINS must be explicit in production")
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

func listenPort() string {
	if p := strings.TrimSpace(os.Getenv("PORT")); p != "" {
		return p
	}
	return getEnv("SERVER_PORT", "8080")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvFirst(keys []string, defaultValue string) string {
	for _, k := range keys {
		if v := os.Getenv(k); v != "" {
			return v
		}
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
