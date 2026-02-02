package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/example/sample-api/internal/api"
	"github.com/example/sample-api/internal/database"
	"github.com/example/sample-api/pkg/utils"
	"github.com/gorilla/mux"
)

func main() {
	// Initialize database
	db, err := database.Connect()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Setup router
	router := mux.NewRouter()
	api.SetupRoutes(router, db)

	// Start server
	port := utils.GetEnv("PORT", "8080")
	addr := fmt.Sprintf(":%s", port)
	
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatal("Server failed:", err)
	}
}
