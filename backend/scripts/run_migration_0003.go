package main

import (
	"fmt"
	"log"
	"os"
	"strings"
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

	sqlBytes, err := os.ReadFile("migrations/0003_create_activity_logs.sql")
	if err != nil {
		log.Fatal(err)
	}

	queries := strings.Split(string(sqlBytes), ";")
	for _, q := range queries {
		q = strings.TrimSpace(q)
		if q == "" || strings.HasPrefix(q, "--") {
			continue
		}
		fmt.Printf("Executing query: %s\n", q)
		if err := db.Exec(q).Error; err != nil {
			fmt.Printf("Error: %v\n", err)
		}
	}

	fmt.Println("Done")
}
