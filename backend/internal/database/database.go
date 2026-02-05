// การเชื่อมต่อ DB (PostgreSQL ผ่าน GORM) — ยังไม่ใช้ (เปิดเมื่อมี DB ใน main.go)
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
		Logger: logger.Default.LogMode(logger.Silent), // ไม่พิมพ์ SQL ตอนรัน
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
