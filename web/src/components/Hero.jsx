import React, { useEffect, useState } from 'react'
import { listGalleryItems } from '../api'

export default function Hero() {
  const [randomImage, setRandomImage] = useState(null)

  useEffect(() => {
    listGalleryItems().then(data => {
      if (data && data.length > 0) {
        // Filter items that have images
        const itemsWithImages = data.filter(item => item.image_path)
        if (itemsWithImages.length > 0) {
          // Select a random image
          const randomIndex = Math.floor(Math.random() * itemsWithImages.length)
          setRandomImage(itemsWithImages[randomIndex].image_path)
        }
      }
    })
  }, [])

  return (
    <section className="hero" style={randomImage ? {
      '--hero-bg-image': `url(${randomImage})`
    } : {}}>
      {randomImage && <div className="hero-background-image" />}
      <div className="hero-content">
        <h1 className="title">Lisa Schnabel</h1>
        <p className="subtitle">Dream Imagery and Abstraction in Oil and Acrylic</p>
      </div>
    </section>
  )
}
