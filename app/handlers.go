package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/minio/minio-go/v7"
)

type Server struct{
    DB *sql.DB
    Minio *minio.Client
}

type authRequest struct{
    Username string `json:"username"`
    Password string `json:"password"`
}

func (s *Server) LoginHandler(w http.ResponseWriter, r *http.Request) {
    var req authRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "bad request", http.StatusBadRequest)
        return
    }

    var stored string
    err := s.DB.QueryRow("select password from admin_users where username=$1", req.Username).Scan(&stored)
    if err != nil || stored != req.Password {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }

    secret := os.Getenv("JWT_SECRET")
    if secret == "" { secret = "devsecret" }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "sub": req.Username,
        "exp": time.Now().Add(time.Hour * 24).Unix(),
    })
    tokenString, err := token.SignedString([]byte(secret))
    if err != nil {
        http.Error(w, "token error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"token": tokenString})
}

func (s *Server) ListProjects(w http.ResponseWriter, r *http.Request) {
    rows, err := s.DB.Query("select id, title, description, image_path, created_at from projects order by created_at desc")
    if err != nil {
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    var out []Project
    for rows.Next() {
        var p Project
        if err := rows.Scan(&p.ID, &p.Title, &p.Description, &p.ImagePath, &p.CreatedAt); err != nil {
            http.Error(w, "scan error", http.StatusInternalServerError)
            return
        }
        out = append(out, p)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(out)
}

func (s *Server) CreateProject(w http.ResponseWriter, r *http.Request) {
    // Parse multipart form with max 10MB
    if err := r.ParseMultipartForm(10 << 20); err != nil {
        http.Error(w, "bad request", http.StatusBadRequest)
        return
    }

    title := r.FormValue("title")
    description := r.FormValue("description")
    
    if title == "" {
        http.Error(w, "title is required", http.StatusBadRequest)
        return
    }

    var imagePath string
    
    // Handle file upload if present
    file, header, err := r.FormFile("image")
    if err == nil {
        defer file.Close()
        
        // Generate unique filename
        ext := filepath.Ext(header.Filename)
        randomBytes := make([]byte, 16)
        rand.Read(randomBytes)
        filename := hex.EncodeToString(randomBytes) + ext
        
        // Upload to MinIO
        bucketName := "projects"
        ctx := context.Background()
        
        // Ensure bucket exists
        exists, err := s.Minio.BucketExists(ctx, bucketName)
        if err != nil {
            http.Error(w, "storage error", http.StatusInternalServerError)
            return
        }
        if !exists {
            err = s.Minio.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
            if err != nil {
                http.Error(w, "storage error", http.StatusInternalServerError)
                return
            }
            // Set bucket policy to allow public read
            policy := fmt.Sprintf(`{
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": ["arn:aws:s3:::%s/*"]
                }]
            }`, bucketName)
            err = s.Minio.SetBucketPolicy(ctx, bucketName, policy)
            if err != nil {
                http.Error(w, "storage error", http.StatusInternalServerError)
                return
            }
        }
        
        // Upload file
        contentType := header.Header.Get("Content-Type")
        if contentType == "" {
            contentType = "application/octet-stream"
        }
        
        _, err = s.Minio.PutObject(ctx, bucketName, filename, file, header.Size, minio.PutObjectOptions{
            ContentType: contentType,
        })
        if err != nil {
            http.Error(w, "upload error", http.StatusInternalServerError)
            return
        }
        
        imagePath = fmt.Sprintf("/api/images/%s/%s", bucketName, filename)
    }

    var p Project
    err = s.DB.QueryRow(
        "insert into projects (title, description, image_path, created_at) values ($1,$2,$3,$4) returning id, created_at",
        title, description, imagePath, time.Now()).Scan(&p.ID, &p.CreatedAt)
    if err != nil {
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }

    p.Title = title
    p.Description = description
    p.ImagePath = imagePath

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(p)
}

func (s *Server) ServeImage(w http.ResponseWriter, r *http.Request) {
    // Extract bucket and object from path: /api/images/{bucket}/{object}
    path := r.URL.Path
    // Remove "/api/images/" prefix
    path = path[len("/api/images/"):]
    
    // Split into bucket and object
    bucketEnd := 0
    for i, c := range path {
        if c == '/' {
            bucketEnd = i
            break
        }
    }
    if bucketEnd == 0 {
        http.Error(w, "invalid path", http.StatusBadRequest)
        return
    }
    
    bucketName := path[:bucketEnd]
    objectName := path[bucketEnd+1:]
    
    // Get object from MinIO
    ctx := context.Background()
    object, err := s.Minio.GetObject(ctx, bucketName, objectName, minio.GetObjectOptions{})
    if err != nil {
        http.Error(w, "not found", http.StatusNotFound)
        return
    }
    defer object.Close()
    
    // Get object info for content type
    stat, err := object.Stat()
    if err != nil {
        http.Error(w, "not found", http.StatusNotFound)
        return
    }
    
    w.Header().Set("Content-Type", stat.ContentType)
    w.Header().Set("Content-Length", fmt.Sprintf("%d", stat.Size))
    
    // Stream the object to response
    io.Copy(w, object)
}

func (s *Server) CORSMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        next.ServeHTTP(w, r)
    })
}

func (s *Server) AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        hdr := r.Header.Get("Authorization")
        if hdr == "" { http.Error(w, "missing auth", http.StatusUnauthorized); return }
        var tokenString string
        // Expect "Bearer <token>"
        _, err := fmt.Sscanf(hdr, "Bearer %s", &tokenString)
        if err != nil || tokenString == "" { http.Error(w, "invalid auth", http.StatusUnauthorized); return }

        secret := os.Getenv("JWT_SECRET")
        if secret == "" { secret = "devsecret" }

        token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
            if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, fmt.Errorf("unexpected signing method")
            }
            return []byte(secret), nil
        })
        if err != nil || !token.Valid { http.Error(w, "unauthorized", http.StatusUnauthorized); return }

        next(w, r)
    }
}
