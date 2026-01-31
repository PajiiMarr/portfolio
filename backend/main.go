package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"github.com/joho/godotenv"
)

const githubGraphQLEndpoint = "https://api.github.com/graphql"

type GraphQLRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables"`
}

func githubContributionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	username := r.URL.Query().Get("username")
	if username == "" {
		username = "PajiiMarr"
	}

	year := r.URL.Query().Get("year")
	if year == "" {
		year = "2026"
	}

	token := os.Getenv("GITHUB_TOKEN")
	if token == "" {
		http.Error(w, `{"error":"Missing GITHUB_TOKEN env variable"}`, http.StatusInternalServerError)
		return
	}

	query := `
	query($login: String!, $from: DateTime!, $to: DateTime!) {
	  user(login: $login) {
		contributionsCollection(from: $from, to: $to) {
		  contributionCalendar {
			totalContributions
			weeks {
			  contributionDays {
				date
				contributionCount
				color
			  }
			}
		  }
		}
	  }
	}
	`

	variables := map[string]interface{}{
		"login": username,
		"from":  fmt.Sprintf("%s-01-01T00:00:00Z", year),
		"to":    fmt.Sprintf("%s-12-31T23:59:59Z", year),
	}

	reqBody := GraphQLRequest{
		Query:     query,
		Variables: variables,
	}

	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", githubGraphQLEndpoint, bytes.NewBuffer(jsonBody))
	if err != nil {
		http.Error(w, `{"error":"Failed to create request"}`, http.StatusInternalServerError)
		return
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, `{"error":"Failed to call GitHub API"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	w.Write(body)
}

func main() {
	http.HandleFunc("/api/github-contributions", githubContributionsHandler)
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found (skipping)")
	}

	fmt.Println("Go server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
