// โครงสร้าง config ทั้งระบบ (อ่านจาก .env) เช่น port, path wiki, GitHub, Ollama ฯลฯ
// ใช้ผ่าน config.AppConfig

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
	OpenClaw OpenClawConfig
	Make     MakeConfig
}

type ServerConfig struct {
	Port        string
	Host        string
	ChatbotURL  string
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
	InsecureSkipVerify bool // true = ยอมรับ TLS certificate ไม่ตรง (ใช้กับ VM ที่ใช้ self-signed)
}

// OpenClawConfig ใช้สำหรับเชื่อมกับ OpenClaw Gateway (OpenAI-compatible HTTP)
type OpenClawConfig struct {
	URL   string // HTTP base URL เช่น http://127.0.0.1:18789
	Token string // Gateway token
	Model string // ชื่อ model ที่ Gateway map ไว้สำหรับ routing (เช่น openrouter/gpt-4o-mini)
	// Enabled ไว้เผื่ออนาคตอยากปิดใช้ OpenClaw ชั่วคราว
	Enabled bool
}

// MakeConfig ใช้เมื่อต้องการให้ขั้นตอน "แยกประเภทคำถาม" ไปรันบน Make (webhook)
type MakeConfig struct {
	WebhookURL           string // URL ของ Make Custom Webhook (ต้องเป็นแบบ Request–Response ถ้าต้องการรอผล)
	WebhookAPIKey        string // ถ้าตั้งใน Make ให้ส่งใน header x-make-apikey
	UseForQuestionRouter bool   // true = ใช้ Make แทน OpenClaw สำหรับ RouteQuestion
}

type ChromaDBConfig struct {
	URL        string
	Collection string
	APIKey     string
	Tenant     string
	Database   string
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
	RepoPath    string // โฟลเดอร์สำหรับ git clone/pull (ควรเป็นโฟลเดอร์ว่าง เช่น ./wiki-content)
	RepoURL     string
	ContentPath string // โฟลเดอร์ที่ใช้อ่าน .md + serve /wiki-assets (ถ้าว่างใช้ RepoPath หรือ RepoPath/carmen_cloud ถ้ามี)
}

var AppConfig *Config

func Load() error {
	// Load .env: ลองจาก cwd ก่อน แล้วลอง ../.env ถ้ารันจาก backend/
	if err := godotenv.Load(".env"); err != nil {
		if err2 := godotenv.Load("../.env"); err2 != nil {
			log.Println("No .env file found, using environment variables")
		}
	}

	AppConfig = &Config{
		Server: ServerConfig{
			Port:        getEnv("SERVER_PORT", "8080"),
			Host:        getEnv("SERVER_HOST", "localhost"),
			ChatbotURL:  getEnv("PYTHON_CHATBOT_URL", "http://localhost:8000"),
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
		OpenClaw: OpenClawConfig{
			URL:     getEnv("OPENCLAW_GATEWAY_URL", ""),
			Token:   getEnv("OPENCLAW_GATEWAY_TOKEN", ""),
			Model:   getEnv("OPENCLAW_MODEL", "default"), // ให้หัวหน้าแมปชื่อ model เองใน Gateway
			Enabled: getEnvAsBool("OPENCLAW_ENABLED", true),
		},
		Make: MakeConfig{
			WebhookURL:           getEnv("MAKE_WEBHOOK_URL", ""),
			WebhookAPIKey:        getEnv("MAKE_WEBHOOK_API_KEY", ""),
			UseForQuestionRouter: getEnvAsBool("USE_MAKE_FOR_ROUTER", false),
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
			RepoPath:    getEnv("GIT_REPO_PATH", "./wiki-content"),
			RepoURL:     getEnv("GIT_REPO_URL", ""),
			ContentPath: getEnv("WIKI_CONTENT_PATH", ""), // ว่าง = จะ resolve ใน GetWikiContentPath()
		},
	}

	return nil
}

// GetWikiContentPath คืน path ที่ใช้อ่าน markdown + serve /wiki-assets
// ถ้า WIKI_CONTENT_PATH ตั้งไว้ใช้ค่านั้น ไม่ว่างใช้ RepoPath/carmen_cloud ถ้ามีโฟลเดอร์อยู่ ไม่ใช่ใช้ RepoPath
// Normalize path ให้เป็น absolute หรือ relative ที่ชัดเจน (มี ./ นำหน้าถ้าเป็น relative)
func GetWikiContentPath() string {
	c := AppConfig.Git
	var basePath string

	if c.ContentPath != "" {
		basePath = c.ContentPath
	} else {
		basePath = c.RepoPath
		// ถ้า RepoPath ไม่ว่าง ให้เช็คว่ามี carmen_cloud subdirectory ไหม
		if basePath != "" {
			repo := normalizePath(basePath)
			sub := filepath.Join(repo, "carmen_cloud")
			if st, err := os.Stat(sub); err == nil && st.IsDir() {
				return normalizePath(sub)
			}
		}
	}

	return normalizePath(basePath)
}

// normalizePath ทำให้ path เป็น absolute หรือ relative ที่ชัดเจน
// ถ้า path ไม่มี / หรือ \ นำหน้า และไม่ใช่ absolute path ให้เพิ่ม ./ นำหน้า
func normalizePath(path string) string {
	if path == "" {
		return "./wiki-content"
	}

	// ถ้าเป็น absolute path (เริ่มด้วย / หรือ drive letter) คืนเลย
	if filepath.IsAbs(path) {
		return filepath.Clean(path)
	}

	// ถ้าเป็น relative path แต่ไม่มี ./ หรือ ../ นำหน้า ให้เพิ่ม ./
	clean := filepath.Clean(path)
	if !strings.HasPrefix(clean, ".") && !strings.HasPrefix(clean, "/") {
		// ถ้าไม่มี . หรือ / นำหน้า ให้เพิ่ม ./
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
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultValue
}
