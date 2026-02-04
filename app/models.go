package main

import "time"

type GalleryItem struct {
    ID int `json:"id"`
    Title string `json:"title"`
    Info string `json:"info"`
    YearCreated int `json:"yearCreated"`
    Story string `json:"story"`
    Description string `json:"description"`
    ImagePath string `json:"image_path"`
    CreatedAt time.Time `json:"created_at"`
}
