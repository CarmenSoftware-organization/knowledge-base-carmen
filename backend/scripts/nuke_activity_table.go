package main

import (
	"fmt"
	"log"
	"os"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file found")
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		os.Getenv("DB_HOST"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"), os.Getenv("DB_PORT"), os.Getenv("DB_SSLMODE"))

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Dropping and recreating activity_logs table...")
	
	db.Exec("DROP TABLE IF EXISTS public.activity_logs CASCADE")
	
	err = db.Exec(`
		CREATE TABLE public.activity_logs (
			id BIGSERIAL PRIMARY KEY,
			bu_id INT REFERENCES public.business_units(id) ON DELETE SET NULL,
			user_id TEXT,
			action TEXT NOT NULL,
			category TEXT NOT NULL,
			details JSONB,
			timestamp TIMESTAMPTZ DEFAULT NOW(),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)
	`).Error
	
	if err != nil {
		log.Fatal(err)
	}

	db.Exec("CREATE INDEX idx_activity_logs_bu_id ON public.activity_logs(bu_id)")
	db.Exec("CREATE INDEX idx_activity_logs_timestamp ON public.activity_logs(timestamp)")
	db.Exec("CREATE INDEX idx_activity_logs_category ON public.activity_logs(category)")

	fmt.Println("Table recreated successfully.")
}
