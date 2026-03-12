package database

import (
	"fmt"
	"os"
	"strings"

	"github.com/new-carmen/backend/internal/config"
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
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Set default schema search path
	if cfg.Schema != "" {
		if err := DB.Exec(fmt.Sprintf("SET search_path TO %s", cfg.Schema)).Error; err != nil {
			return fmt.Errorf("failed to set search_path: %w", err)
		}
	}

	return nil
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

// RunSQLFile reads a .sql file and executes each statement (split by ;)
func RunSQLFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read migration file: %w", err)
	}
	sql := string(data)
	// ลบบรรทัด comment
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

// ClearPublicTables truncates all user tables in the `public` schema while
// preserving extensions, functions and types. It restarts identity (sequences)
// and cascades to dependent tables. Use with care and always back up first.
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

// TruncateBUTables truncates documents and document_chunks for a BU schema.
// Use before reindex to start fresh.
func TruncateBUTables(bu string) error {
	if bu == "" {
		return fmt.Errorf("bu cannot be empty")
	}
	// document_chunks has FK to documents, so CASCADE on documents will delete chunks
	sql := fmt.Sprintf("TRUNCATE TABLE %s.documents RESTART IDENTITY CASCADE", bu)
	return DB.Exec(sql).Error
}
