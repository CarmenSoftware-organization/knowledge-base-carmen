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
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Ollama   OllamaConfig
	GitHub   GitHubConfig
	Git      GitConfig
}

type ServerConfig struct {
	Port        string
	Host        string
	Environment string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type JWTConfig struct {
	Secret string
	Expiry string
}

type OllamaConfig struct {
	URL                string
	ChatModel          string
	EmbedModel         string
	InsecureSkipVerify bool
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
	RepoPath    string 
	RepoURL     string
	ContentPath string 
}

var AppConfig *Config

func Load() error {
	if err := godotenv.Load(".env"); err != nil {
		if err2 := godotenv.Load("backend/.env"); err2 != nil {
			log.Println("No .env file found, using environment variables")
		}
	}

	AppConfig = &Config{
		Server: ServerConfig{
			Port:        getEnv("SERVER_PORT", "8080"),
			Host:        getEnv("SERVER_HOST", "localhost"),
			Environment: getEnv("ENVIRONMENT", "development"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			Name:     getEnv("DB_NAME", "carmen_db"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", "change-me-in-production"),
			Expiry: getEnv("JWT_EXPIRY", "24h"),
		},
		Ollama: OllamaConfig{
			URL:                getEnv("OLLAMA_URL", "http://localhost:11434"),
			ChatModel:          getEnv("OLLAMA_CHAT_MODEL", getEnv("OLLAMA_MODEL", "llama2")),
			EmbedModel:         getEnv("OLLAMA_EMBED_MODEL", getEnv("OLLAMA_MODEL", "llama2")),
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
			RepoPath:    getEnv("GIT_REPO_PATH", "./wiki-content"),
			RepoURL:     getEnv("GIT_REPO_URL", ""),
			ContentPath: getEnv("WIKI_CONTENT_PATH", ""),
		},
	}

	return nil
}


func GetWikiContentPath() string {
	c := AppConfig.Git
	if c.ContentPath != "" {
		return normalizePath(c.ContentPath)
	}
	if c.RepoPath != "" {
		repo := normalizePath(c.RepoPath)
		sub := filepath.Join(repo, "carmen_cloud")
		if st, err := os.Stat(sub); err == nil && st.IsDir() {
			return normalizePath(sub)
		}
		return repo
	}
	return "./wiki-content"
}

// normalizePath cleans and ensures relative paths are prefixed with "./".
func normalizePath(path string) string {
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

func getEnvAsBool(key string, defaultValue bool) bool {
	if value, err := strconv.ParseBool(getEnv(key, "")); err == nil {
		return value
	}
	return defaultValue
}
