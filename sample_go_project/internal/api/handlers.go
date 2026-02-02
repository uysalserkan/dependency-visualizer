package api

import (
	"encoding/json"
	"net/http"

	"github.com/example/sample-api/internal/database"
	"github.com/example/sample-api/pkg/utils"
	"github.com/gorilla/mux"
)

// SetupRoutes configures API routes
func SetupRoutes(router *mux.Router, db *database.DB) {
	router.HandleFunc("/health", healthHandler).Methods("GET")
	router.HandleFunc("/api/users", getUsersHandler(db)).Methods("GET")
	router.HandleFunc("/api/users/{id}", getUserHandler(db)).Methods("GET")
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"version": "1.0.0",
	})
}

func getUsersHandler(db *database.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		users, err := db.GetAllUsers()
		if err != nil {
			utils.RespondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		utils.RespondJSON(w, http.StatusOK, users)
	}
}

func getUserHandler(db *database.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		
		user, err := db.GetUserByID(id)
		if err != nil {
			utils.RespondError(w, http.StatusNotFound, "User not found")
			return
		}
		utils.RespondJSON(w, http.StatusOK, user)
	}
}
