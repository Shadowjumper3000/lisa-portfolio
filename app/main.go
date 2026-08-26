package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

func initGalleryBucket(minioClient *minio.Client) error {
	ctx := context.Background()
	bucketName := "gallery"
	
	// Check if bucket exists
	exists, err := minioClient.BucketExists(ctx, bucketName)
	if err != nil {
		return fmt.Errorf("check bucket exists: %w", err)
	}
	
	// Create bucket if it doesn't exist
	if !exists {
		err = minioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
		if err != nil {
			return fmt.Errorf("create bucket: %w", err)
		}
		log.Printf("Created MinIO bucket: %s", bucketName)
	}
	
	// Set public read policy
	policy := `{
		"Version": "2012-10-17",
		"Statement": [{
			"Effect": "Allow",
			"Principal": {"AWS": ["*"]},
			"Action": ["s3:GetObject"],
			"Resource": ["arn:aws:s3:::gallery/*"]
		}]
	}`
	
	err = minioClient.SetBucketPolicy(ctx, bucketName, policy)
	if err != nil {
		return fmt.Errorf("set bucket policy: %w", err)
	}
	
	log.Printf("Gallery bucket initialized with public read policy")
	return nil
}

func runMigrations(db *sql.DB) error {
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return err
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file:///app/migrations",
		"postgres", driver)
	if err != nil {
		return err
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}

	log.Println("Database migrations completed successfully")
	return nil
}

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

	// Run database migrations
	if err := runMigrations(db); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

    // Initialize MinIO client
    endpoint := os.Getenv("MINIO_ENDPOINT")
    if endpoint == "" {
        // MinIO is a sibling process on loopback, not a separate container.
        endpoint = "127.0.0.1:9000"
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
    
    log.Printf("MinIO client initialized: endpoint=%s, useSSL=%v", endpoint, useSSL)

	// Initialize gallery bucket with public read policy
	if err := initGalleryBucket(minioClient); err != nil {
		log.Printf("Warning: failed to initialize gallery bucket: %v", err)
	}

    srv := &Server{DB: db, Minio: minioClient}

    r := mux.NewRouter()
    
    // Apply CORS middleware to all routes
    r.Use(srv.CORSMiddleware)

    // Auth endpoints
    r.HandleFunc("/api/auth/login", srv.LoginHandler).Methods("POST", "OPTIONS")
    
    // Images endpoints
    r.HandleFunc("/api/images", srv.ListGalleryItems).Methods("GET", "OPTIONS")
    r.HandleFunc("/api/images/reorder", srv.AuthMiddleware(srv.ReorderGalleryItems)).Methods("PUT", "OPTIONS")
    r.HandleFunc("/api/images/{id}", srv.GetGalleryItemByID).Methods("GET", "OPTIONS")
    r.HandleFunc("/api/images", srv.AuthMiddleware(srv.CreateGalleryItem)).Methods("POST", "OPTIONS")
    r.HandleFunc("/api/images/{id}", srv.AuthMiddleware(srv.UpdateGalleryItemJSON)).Methods("PUT", "OPTIONS")
    r.HandleFunc("/api/images/{id}", srv.AuthMiddleware(srv.DeleteGalleryItem)).Methods("DELETE", "OPTIONS")
    r.PathPrefix("/api/images/").HandlerFunc(srv.ServeImage).Methods("GET", "OPTIONS")
    
    // Settings endpoint
    r.HandleFunc("/api/settings", srv.GetSettings).Methods("GET", "OPTIONS")
    r.HandleFunc("/api/settings", srv.AuthMiddleware(srv.UpdateSettings)).Methods("PUT", "OPTIONS")
    
    // Serve image files from MinIO
    // Settings endpoint
    r.HandleFunc("/api/settings", srv.GetSettings).Methods("GET", "OPTIONS")
    r.HandleFunc("/api/settings", srv.AuthMiddleware(srv.UpdateSettings)).Methods("PUT", "OPTIONS")
    
    // Health endpoint
    r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        serverName := os.Getenv("SERVER_NAME")
        if serverName == "" {
            if hn, err := os.Hostname(); err == nil { serverName = hn }
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"status":"ok","server":serverName})
    }).Methods("GET")

    // In the all-in-one container the API is fronted by nginx (or Vite in dev)
    // on loopback, so APP_ADDR pins it to 127.0.0.1 and it is never reachable
    // from outside the container. Defaults to the old ":8080" when unset.
    addr := os.Getenv("APP_ADDR")
    if addr == "" {
        addr = ":8080"
    }
    log.Printf("listening %s (server=%s)", addr, os.Getenv("SERVER_NAME"))
    log.Fatal(http.ListenAndServe(addr, r))
}
