package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

func main() {
    dsn := os.Getenv("DATABASE_URL")
    if dsn == "" {
        // fallback to components
        host := os.Getenv("DB_HOST")
        port := os.Getenv("DB_PORT")
        user := os.Getenv("DB_USER")
        pass := os.Getenv("DB_PASSWORD")
        dbname := os.Getenv("DB_NAME")
        dsn = "postgres://" + user + ":" + pass + "@" + host + ":" + port + "/" + dbname + "?sslmode=disable"
    }

    db, err := sql.Open("postgres", dsn)
    if err != nil {
        log.Fatalf("db open: %v", err)
    }
    defer db.Close()

    // Initialize MinIO client
    endpoint := os.Getenv("MINIO_ENDPOINT")
    if endpoint == "" {
        endpoint = "minio:9000"
    }
    accessKey := os.Getenv("MINIO_ACCESS_KEY")
    if accessKey == "" {
        accessKey = "minioadmin"
    }
    secretKey := os.Getenv("MINIO_SECRET_KEY")
    if secretKey == "" {
        secretKey = "minioadmin"
    }
    useSSL := os.Getenv("MINIO_USE_SSL") == "true"

    minioClient, err := minio.New(endpoint, &minio.Options{
        Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
        Secure: useSSL,
    })
    if err != nil {
        log.Fatalf("minio init: %v", err)
    }

    srv := &Server{DB: db, Minio: minioClient}

    r := mux.NewRouter()
    
    // Apply CORS middleware to all routes
    r.Use(srv.CORSMiddleware)

    r.HandleFunc("/api/auth/login", srv.LoginHandler).Methods("POST", "OPTIONS")
    r.HandleFunc("/api/gallery", srv.ListGalleryItems).Methods("GET", "OPTIONS")
    r.HandleFunc("/api/gallery", srv.AuthMiddleware(srv.CreateGalleryItem)).Methods("POST", "OPTIONS")
    r.PathPrefix("/api/images/").HandlerFunc(srv.ServeImage).Methods("GET", "OPTIONS")
    // health endpoint exposes server name and basic status
    r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        serverName := os.Getenv("SERVER_NAME")
        if serverName == "" {
            if hn, err := os.Hostname(); err == nil { serverName = hn }
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"status":"ok","server":serverName})
    }).Methods("GET")

    addr := ":8080"
    log.Printf("listening %s (server=%s)", addr, os.Getenv("SERVER_NAME"))
    log.Fatal(http.ListenAndServe(addr, r))
}
