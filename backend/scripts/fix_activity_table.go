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

	// Add missing columns if they don't exist
	missingColumns := map[string]string{
		"bu_id":    "INT REFERENCES public.business_units(id) ON DELETE SET NULL",
		"user_id":  "TEXT",
		"action":   "TEXT NOT NULL",
		"category": "TEXT NOT NULL",
	}

	for col, definition := range missingColumns {
		var exists bool
		db.Raw("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = ?)", col).Scan(&exists)
		
		if !exists {
			fmt.Printf("Adding column %s to activity_logs...\n", col)
			query := fmt.Sprintf("ALTER TABLE public.activity_logs ADD COLUMN %s %s", col, definition)
			if err := db.Exec(query).Error; err != nil {
				fmt.Printf("Error adding column %s: %v\n", col, err)
			}
		} else {
			fmt.Printf("Column %s already exists\n", col)
		}
	}

	fmt.Println("Database fix completed.")
}
