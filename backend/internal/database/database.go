package database

import (
	"fmt"
	"os"
	"strings"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/security"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() error {
	cfg := config.AppConfig.Database

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		cfg.Host, cfg.User, cfg.Password, cfg.Name, cfg.Port, cfg.SSLMode,
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
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
		if err := DB.Exec("SELECT set_config('search_path', ?, false)", searchPath).Error; err != nil {
			return fmt.Errorf("failed to set search_path: %w", err)
		}
	}

	return nil
}

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

func Close() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func Migrate(models ...interface{}) error {
	if err := DB.AutoMigrate(models...); err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}
	return nil
}

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

func TruncateBUTables(bu string) error {
	if bu == "" {
		return fmt.Errorf("bu cannot be empty")
	}
	sql := fmt.Sprintf("TRUNCATE TABLE %s.documents RESTART IDENTITY CASCADE", bu)
	return DB.Exec(sql).Error
}

// TruncateAllBUIndexTables runs TRUNCATE on <slug>.documents for every slug in public.business_units.
func TruncateAllBUIndexTables() error {
	var slugs []string
	if err := DB.Table("public.business_units").Order("id").Pluck("slug", &slugs).Error; err != nil {
		return fmt.Errorf("list business_units: %w", err)
	}
	for _, slug := range slugs {
		slug = strings.TrimSpace(slug)
		if slug == "" || !security.ValidateSchema(slug) {
			continue
		}
		if err := TruncateBUTables(slug); err != nil {
			return fmt.Errorf("truncate %s.documents: %w", slug, err)
		}
	}
	return nil
}
