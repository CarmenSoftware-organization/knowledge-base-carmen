package main

import (
	"fmt"
	"log"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatal(err)
	}
	if err := database.Connect(); err != nil {
		log.Fatal(err)
	}

	var bus []models.BusinessUnit
	if err := database.DB.Table("public.business_units").Find(&bus).Error; err != nil {
		log.Fatal(err)
	}

	fmt.Println("--- Business Units Start ---")
	for _, bu := range bus {
		fmt.Printf("ID:%d | Name:%s | Slug:%s\n", bu.ID, bu.Name, bu.Slug)
	}
	fmt.Println("--- Business Units End ---")
}
