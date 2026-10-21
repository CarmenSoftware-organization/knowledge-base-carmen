package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"sync/atomic"
	"time"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/security"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// ready reports whether DB is set and the last ping succeeded. DB is written
// before ready is stored, so a reader that sees Ready() == true can use DB.
var ready atomic.Bool

// Ready reports whether the database is currently reachable. When false the
// server runs in wiki-only mode: markdown content is served from disk while
// DB-backed routes answer 503 (see middleware.RequireDB).
func Ready() bool { return ready.Load() }

// Connect opens the global GORM DB handle from AppConfig and applies search_path.
// DB is only assigned on success.
func Connect() error {
	cfg := config.AppConfig.Database

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s connect_timeout=5",
		cfg.Host, cfg.User, cfg.Password, cfg.Name, cfg.Port, cfg.SSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})

	if err != nil {
		hint := ""
		if cfg.Host == "localhost" || cfg.Host == "127.0.0.1" {
			hint = " Defaults (localhost/postgres/5432) usually mean backend/.env was not loaded — save the file on disk or set BACKEND_DOTENV to its absolute path."
		}
		return fmt.Errorf(
			"failed to connect to database%s (host=%s port=%s dbname=%s user=%s sslmode=%s): %w",
			hint, cfg.Host, cfg.Port, cfg.Name, cfg.User, cfg.SSLMode, err,
		)
	}

	if cfg.Schema != "" {
		searchPath, err := normalizeSearchPath(cfg.Schema)
		if err != nil {
			return err
		}
		if err := db.Exec("SELECT set_config('search_path', ?, false)", searchPath).Error; err != nil {
			return fmt.Errorf("failed to set search_path: %w", err)
		}
	}

	DB = db
	ready.Store(true)
	return nil
}

// Monitor keeps Ready() in sync with the database until ctx is done: while no
// handle exists it retries Connect, otherwise it pings the pool (which
// reconnects on its own once the DB is back).
func Monitor(ctx context.Context, interval time.Duration) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
		was := Ready()
		if DB == nil {
			if err := Connect(); err != nil {
				continue
			}
		} else if sqlDB, err := DB.DB(); err == nil {
			pctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			ready.Store(sqlDB.PingContext(pctx) == nil)
			cancel()
		}
		if now := Ready(); now != was {
			if now {
				log.Println("Database: reachable again — DB-backed routes re-enabled")
			} else {
				log.Println("WARNING: database unreachable — serving wiki content only")
			}
		}
	}
}

// normalizeSearchPath validates and trims each schema in a CSV into a search_path string.
func normalizeSearchPath(schemaCSV string) (string, error) {
	parts := strings.Split(schemaCSV, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		s := strings.TrimSpace(p)
		if s == "" {
			continue
		}
		if !security.ValidateSchema(s) {
			return "", fmt.Errorf("invalid schema in DB_SCHEMA: %q", s)
		}
		out = append(out, s)
	}
	if len(out) == 0 {
		return "", fmt.Errorf("DB_SCHEMA is empty after normalization")
	}
	return strings.Join(out, ","), nil
}

// Close closes the underlying sql.DB connection pool.
func Close() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// Migrate runs GORM AutoMigrate for the given models.
func Migrate(models ...interface{}) error {
	if err := DB.AutoMigrate(models...); err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}
	return nil
}

// RunSQLFile reads a .sql file, strips comments/blank lines, and executes each statement.
func RunSQLFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read migration file: %w", err)
	}
	sql := string(data)
	lines := strings.Split(sql, "\n")
	var filtered []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "--") {
			continue
		}
		filtered = append(filtered, line)
	}
	sql = strings.Join(filtered, "\n")

	for _, stmt := range strings.Split(sql, ";") {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if err := DB.Exec(stmt).Error; err != nil {
			return fmt.Errorf("execute: %w", err)
		}
	}
	return nil
}

// ClearPublicTables truncates every non-system table in the public schema.
func ClearPublicTables() error {
	sql := `DO $$
DECLARE
	tbls text;
BEGIN
	SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
		INTO tbls
	FROM pg_tables
	WHERE schemaname = 'public'
		AND tablename NOT LIKE 'pg_%'
		AND tablename NOT LIKE 'sql_%';

	IF tbls IS NULL THEN
		RETURN;
	END IF;

	EXECUTE 'TRUNCATE TABLE ' || tbls || ' RESTART IDENTITY CASCADE';
END$$;`

	return DB.Exec(sql).Error
}

// ClearChatAndActivityTables truncates only chat history and activity logs for
// all BUs. Unlike ClearPublicTables it leaves documents/chunks/business_units/
// faq intact — this backs the HTTP POST /api/system/reset endpoint.
func ClearChatAndActivityTables() error {
	return DB.Exec(`TRUNCATE TABLE public.chat_history, public.activity_logs RESTART IDENTITY`).Error
}

// TruncateBUTables deletes one BU's documents (and chunks, via FK cascade).
func TruncateBUTables(bu string) error {
	if bu == "" {
		return fmt.Errorf("bu cannot be empty")
	}
	if !security.ValidateSchema(bu) {
		return fmt.Errorf("invalid bu: %q", bu)
	}
	return DB.Exec(
		`DELETE FROM public.documents WHERE bu_id = (SELECT id FROM public.business_units WHERE slug = ?)`,
		bu,
	).Error
}

// TruncateAllBUIndexTables clears the shared index tables for every BU.
func TruncateAllBUIndexTables() error {
	return DB.Exec(`TRUNCATE TABLE public.document_chunks, public.documents RESTART IDENTITY CASCADE`).Error
}
