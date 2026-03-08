package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

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

	// Parse from/to query params (expected as YYYY-MM-DD)
	fromStr := r.URL.Query().Get("from")
	toStr   := r.URL.Query().Get("to")

	now := time.Now().UTC()

	var fromTime, toTime time.Time

	if fromStr != "" {
		t, err := time.Parse("2006-01-02", fromStr)
		if err == nil {
			fromTime = t
		}
	}
	if toStr != "" {
		t, err := time.Parse("2006-01-02", toStr)
		if err == nil {
			// end of day
			toTime = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, time.UTC)
		}
	}

	// Fallback: last 12 months
	if fromTime.IsZero() {
		fromTime = now.AddDate(-1, 0, 0)
	}
	if toTime.IsZero() {
		toTime = now
	}

	// GitHub GraphQL requires full RFC3339 DateTime
	fromISO := fromTime.Format(time.RFC3339)
	toISO   := toTime.Format(time.RFC3339)

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
		"from":  fromISO,
		"to":    toISO,
	}

	reqBody := GraphQLRequest{Query: query, Variables: variables}
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
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found (skipping)")
	}

	http.HandleFunc("/api/github-contributions", githubContributionsHandler)

	fmt.Println("Go server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}