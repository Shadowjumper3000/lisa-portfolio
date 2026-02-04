package main

import "time"

type Project struct {
    ID int `json:"id"`
    Title string `json:"title"`
    Description string `json:"description"`
    ImagePath string `json:"image_path"`
    CreatedAt time.Time `json:"created_at"`
}
