// โครงสร้าง config ทั้งระบบ (อ่านจาก .env) เช่น port, path wiki, GitHub, Ollama ฯลฯ
// ใช้ผ่าน config.AppConfig

package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Ollama OllamaConfig
	GitHub GitHubConfig
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
	URL                  string
	ChatModel            string
	EmbedModel           string
	InsecureSkipVerify   bool // true = ยอมรับ TLS certificate ไม่ตรง (ใช้กับ VM ที่ใช้ self-signed)
}

type ChromaDBConfig struct {
	URL        string
	Collection string
	APIKey     string
	Tenant     string
	Database   string
}

type GitHubConfig struct {
	Token           string
	Owner           string
	Repo            string
	Branch          string
	WebhookSecret   string
	WebhookBranch   string
}

type GitConfig struct {
	RepoPath string
	RepoURL  string
}

var AppConfig *Config

func Load() error {
	// Load .env: ลองจาก cwd ก่อน แล้วลอง backend/.env ถ้ารันจาก repo root
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
		// ไม่ใช้เมื่อปิด DB ใน main.go (เปิดเมื่อพร้อมใช้ DB/role)
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
			// ถ้าไม่ตั้ง GITHUB_WEBHOOK_BRANCH จะใช้ค่าเดียวกับ GITHUB_BRANCH
			WebhookBranch: getEnv("GITHUB_WEBHOOK_BRANCH", getEnv("GITHUB_BRANCH", "main")),
		},
		Git: GitConfig{
			RepoPath: getEnv("GIT_REPO_PATH", "./wiki-content"),
			RepoURL:  getEnv("GIT_REPO_URL", ""),
		},
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultValue
}
