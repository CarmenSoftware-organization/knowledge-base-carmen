
package database

import (
	"fmt"

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
