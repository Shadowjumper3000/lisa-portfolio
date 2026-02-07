package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
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

func (s *Server) ListGalleryItems(w http.ResponseWriter, r *http.Request) {
    rows, err := s.DB.Query("select id, title, info, story, description, image_path, year_created, created_at from gallery_items order by created_at desc")
    if err != nil {
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    var out []GalleryItem
    for rows.Next() {
        var p GalleryItem
        if err := rows.Scan(&p.ID, &p.Title, &p.Info, &p.Story, &p.Description, &p.ImagePath, &p.YearCreated, &p.CreatedAt); err != nil {
            http.Error(w, "scan error", http.StatusInternalServerError)
            return
        }
        out = append(out, p)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(out)
}

func (s *Server) CreateGalleryItem(w http.ResponseWriter, r *http.Request) {
    // Parse multipart form with max 500MB
    if err := r.ParseMultipartForm(500 << 20); err != nil {
        http.Error(w, "bad request", http.StatusBadRequest)
        return
    }

    title := r.FormValue("title")
    info := r.FormValue("info")
    yearStr := r.FormValue("yearCreated")
    yearCreated := 0
    if yearStr != "" {
        if y, err := strconv.Atoi(yearStr); err == nil {
            yearCreated = y
        }
    }
    story := r.FormValue("story")
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
        bucketName := "gallery"
        ctx := context.Background()
        
        // Ensure bucket exists
        exists, err := s.Minio.BucketExists(ctx, bucketName)
        if err != nil {
                log.Printf("MinIO BucketExists error: %v", err)
                http.Error(w, "storage error", http.StatusInternalServerError)
            return
        }
        if !exists {
            err = s.Minio.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
            if err != nil {
                log.Printf("MinIO MakeBucket error: %v", err)
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
                log.Printf("MinIO SetBucketPolicy error: %v", err)
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
            log.Printf("MinIO PutObject error: %v", err)
            http.Error(w, "upload error", http.StatusInternalServerError)
            return
        }
        
        imagePath = fmt.Sprintf("/api/images/%s/%s", bucketName, filename)
    }

    var p GalleryItem
    err = s.DB.QueryRow(
        "insert into gallery_items (title, info, story, description, image_path, year_created, created_at) values ($1,$2,$3,$4,$5,$6,$7) returning id, created_at",
        title, info, story, description, imagePath, yearCreated, time.Now()).Scan(&p.ID, &p.CreatedAt)
    if err != nil {
        log.Printf("DB insert error: %v", err)
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }

    p.Title = title
    p.Info = info
    p.YearCreated = yearCreated
    p.Story = story
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
        log.Printf("MinIO GetObject error for %s/%s: %v", bucketName, objectName, err)
        http.Error(w, "not found", http.StatusNotFound)
        return
    }
    defer object.Close()
    
    // Get object info for content type
    stat, err := object.Stat()
    if err != nil {
        log.Printf("MinIO Stat error for %s/%s: %v", bucketName, objectName, err)
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
        // Allow requested headers (for preflight) or fall back to common headers
        reqHeaders := r.Header.Get("Access-Control-Request-Headers")
        if reqHeaders != "" {
            w.Header().Set("Access-Control-Allow-Headers", reqHeaders)
        } else {
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        }
        // Allow credentials if needed
        w.Header().Set("Access-Control-Allow-Credentials", "true")
        
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

func (s *Server) UpdateGalleryItem(w http.ResponseWriter, r *http.Request) {
    // expects multipart form similar to CreateGalleryItem
    vars := mux.Vars(r)
    idStr := vars["id"]
    id, err := strconv.Atoi(idStr)
    if err != nil || id <= 0 {
        http.Error(w, "invalid id", http.StatusBadRequest)
        return
    }

    // Get existing image path so we can delete object if replaced
    var existingImagePath string
    if err := s.DB.QueryRow("select image_path from gallery_items where id=$1", id).Scan(&existingImagePath); err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "not found", http.StatusNotFound)
            return
        }
        log.Printf("DB select error: %v", err)
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }

    if err := r.ParseMultipartForm(10 << 20); err != nil {
        http.Error(w, "bad request", http.StatusBadRequest)
        return
    }

    title := r.FormValue("title")
    info := r.FormValue("info")
    yearStr := r.FormValue("yearCreated")
    yearCreated := 0
    if yearStr != "" {
        if y, err := strconv.Atoi(yearStr); err == nil {
            yearCreated = y
        }
    }
    story := r.FormValue("story")
    description := r.FormValue("description")

    if title == "" {
        http.Error(w, "title is required", http.StatusBadRequest)
        return
    }

    imagePath := existingImagePath

    // Handle file upload if present
    file, header, err := r.FormFile("image")
    if err == nil {
        defer file.Close()

        ext := filepath.Ext(header.Filename)
        randomBytes := make([]byte, 16)
        rand.Read(randomBytes)
        filename := hex.EncodeToString(randomBytes) + ext

        bucketName := "gallery"
        ctx := context.Background()

        exists, err := s.Minio.BucketExists(ctx, bucketName)
        if err != nil {
            log.Printf("MinIO BucketExists error: %v", err)
            http.Error(w, "storage error", http.StatusInternalServerError)
            return
        }
        if !exists {
            err = s.Minio.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
            if err != nil {
                log.Printf("MinIO MakeBucket error: %v", err)
                http.Error(w, "storage error", http.StatusInternalServerError)
                return
            }
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
                log.Printf("MinIO SetBucketPolicy error: %v", err)
                http.Error(w, "storage error", http.StatusInternalServerError)
                return
            }
        }

        contentType := header.Header.Get("Content-Type")
        if contentType == "" {
            contentType = "application/octet-stream"
        }

        _, err = s.Minio.PutObject(ctx, bucketName, filename, file, header.Size, minio.PutObjectOptions{
            ContentType: contentType,
        })
        if err != nil {
            log.Printf("MinIO PutObject error: %v", err)
            http.Error(w, "upload error", http.StatusInternalServerError)
            return
        }

        // Delete old object if it exists and is in the expected path format
        if existingImagePath != "" {
            // existingImagePath expected like /api/images/{bucket}/{object}
            parts := splitPath(existingImagePath)
            if len(parts) >= 3 {
                // parts[0] == "api", parts[1] == "images", parts[2]==bucket, parts[3]==object...
                // so bucket at index 2, object is join of remaining
                if parts[0] == "api" && parts[1] == "images" {
                    bucket := parts[2]
                    object := ""
                    if len(parts) >= 4 {
                        object = parts[3]
                        if len(parts) > 4 {
                            for i:=4;i<len(parts);i++ { object = object + "/" + parts[i] }
                        }
                    }
                    if bucket != "" && object != "" {
                        // remove old object (best-effort)
                        err := s.Minio.RemoveObject(ctx, bucket, object, minio.RemoveObjectOptions{})
                        if err != nil {
                            log.Printf("MinIO RemoveObject warning: %v", err)
                        }
                    }
                }
            }
        }

        imagePath = fmt.Sprintf("/api/images/%s/%s", bucketName, filename)
    }

    // Update DB with new values (keep imagePath as existing if not changed)
    var p GalleryItem
    err = s.DB.QueryRow(
        "update gallery_items set title=$1, info=$2, story=$3, description=$4, image_path=$5, year_created=$6 where id=$7 returning created_at",
        title, info, story, description, imagePath, yearCreated, id).Scan(&p.CreatedAt)
    if err != nil {
        log.Printf("DB update error: %v", err)
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }

    p.ID = id
    p.Title = title
    p.Info = info
    p.YearCreated = yearCreated
    p.Story = story
    p.Description = description
    p.ImagePath = imagePath

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(p)
}

func (s *Server) DeleteGalleryItem(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    idStr := vars["id"]
    id, err := strconv.Atoi(idStr)
    if err != nil || id <= 0 {
        http.Error(w, "invalid id", http.StatusBadRequest)
        return
    }

    // Get existing image path so we can delete the object from MinIO
    var imagePath string
    if err := s.DB.QueryRow("select image_path from gallery_items where id=$1", id).Scan(&imagePath); err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "not found", http.StatusNotFound)
            return
        }
        log.Printf("DB select error: %v", err)
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }

    // Delete from database
    result, err := s.DB.Exec("delete from gallery_items where id=$1", id)
    if err != nil {
        log.Printf("DB delete error: %v", err)
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }

    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        http.Error(w, "not found", http.StatusNotFound)
        return
    }

    // Delete image from MinIO if it exists
    if imagePath != "" {
        parts := splitPath(imagePath)
        if len(parts) >= 3 && parts[0] == "api" && parts[1] == "images" {
            bucket := parts[2]
            object := ""
            if len(parts) >= 4 {
                object = parts[3]
                if len(parts) > 4 {
                    for i := 4; i < len(parts); i++ {
                        object = object + "/" + parts[i]
                    }
                }
            }
            if bucket != "" && object != "" {
                ctx := context.Background()
                err := s.Minio.RemoveObject(ctx, bucket, object, minio.RemoveObjectOptions{})
                if err != nil {
                    log.Printf("MinIO RemoveObject warning: %v", err)
                }
            }
        }
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// splitPath splits a URL path into segments
func splitPath(p string) []string {
    out := []string{}
    cur := ""
    for _, c := range p {
        if c == '/' {
            if cur != "" {
                out = append(out, cur)
                cur = ""
            }
            continue
        }
        cur += string(c)
    }
    if cur != "" { out = append(out, cur) }
    return out
}

// GetGalleryItemByID retrieves a single gallery item
func (s *Server) GetGalleryItemByID(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    idStr := vars["id"]
    id, err := strconv.Atoi(idStr)
    if err != nil || id <= 0 {
        http.Error(w, "invalid id", http.StatusBadRequest)
        return
    }

    var p GalleryItem
    err = s.DB.QueryRow(
        "select id, title, info, story, description, image_path, year_created, created_at from gallery_items where id=$1",
        id).Scan(&p.ID, &p.Title, &p.Info, &p.Story, &p.Description, &p.ImagePath, &p.YearCreated, &p.CreatedAt)
    
    if err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "not found", http.StatusNotFound)
            return
        }
        log.Printf("DB select error: %v", err)
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(p)
}

// UpdateGalleryItemJSON updates gallery item with JSON payload (for new frontend)
func (s *Server) UpdateGalleryItemJSON(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    idStr := vars["id"]
    id, err := strconv.Atoi(idStr)
    if err != nil || id <= 0 {
        http.Error(w, "invalid id", http.StatusBadRequest)
        return
    }

    var req struct {
        Title       string `json:"title"`
        Description string `json:"description"`
        Category    string `json:"category"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "bad request", http.StatusBadRequest)
        return
    }

    // Get existing item to preserve other fields
    var p GalleryItem
    err = s.DB.QueryRow(
        "select id, title, info, story, description, image_path, year_created, created_at from gallery_items where id=$1",
        id).Scan(&p.ID, &p.Title, &p.Info, &p.Story, &p.Description, &p.ImagePath, &p.YearCreated, &p.CreatedAt)
    
    if err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "not found", http.StatusNotFound)
            return
        }
        log.Printf("DB select error: %v", err)
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }

    // Update fields
    if req.Title != "" {
        p.Title = req.Title
    }
    if req.Description != "" {
        p.Description = req.Description
    }
    // Category maps to info field
    if req.Category != "" {
        p.Info = req.Category
    }

    // Save to database
    _, err = s.DB.Exec(
        "update gallery_items set title=$1, info=$2, description=$3 where id=$4",
        p.Title, p.Info, p.Description, id)
    
    if err != nil {
        log.Printf("DB update error: %v", err)
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(p)
}

// HandleContact processes contact form submissions
func (s *Server) HandleContact(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Name    string `json:"name"`
        Email   string `json:"email"`
        Message string `json:"message"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "bad request", http.StatusBadRequest)
        return
    }

    if req.Name == "" || req.Email == "" || req.Message == "" {
        http.Error(w, "all fields are required", http.StatusBadRequest)
        return
    }

    // Store contact submission in database
    _, err := s.DB.Exec(
        "insert into contact_submissions (name, email, message, created_at) values ($1, $2, $3, $4)",
        req.Name, req.Email, req.Message, time.Now())
    
    if err != nil {
        log.Printf("DB insert error: %v", err)
        http.Error(w, "failed to save contact", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

type SiteSettings struct {
    HeroImageID  *int `json:"hero_image_id"`
    AboutImageID *int `json:"about_image_id"`
}

// GetSettings retrieves site settings
func (s *Server) GetSettings(w http.ResponseWriter, r *http.Request) {
    var settings SiteSettings
    err := s.DB.QueryRow(
        "select hero_image_id, about_image_id from site_settings where id=1").Scan(
        &settings.HeroImageID, &settings.AboutImageID)
    
    if err != nil {
        if err == sql.ErrNoRows {
            // Return empty settings if none exist
            settings = SiteSettings{}
        } else {
            log.Printf("DB select error: %v", err)
            http.Error(w, "db error", http.StatusInternalServerError)
            return
        }
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(settings)
}

// UpdateSettings updates site settings
func (s *Server) UpdateSettings(w http.ResponseWriter, r *http.Request) {
    var settings SiteSettings
    if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
        http.Error(w, "bad request", http.StatusBadRequest)
        return
    }

    // Upsert settings
    _, err := s.DB.Exec(
        `insert into site_settings (id, hero_image_id, about_image_id, updated_at) 
         values (1, $1, $2, $3) 
         on conflict (id) do update 
         set hero_image_id=$1, about_image_id=$2, updated_at=$3`,
        settings.HeroImageID, settings.AboutImageID, time.Now())
    
    if err != nil {
        log.Printf("DB upsert error: %v", err)
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(settings)
}

