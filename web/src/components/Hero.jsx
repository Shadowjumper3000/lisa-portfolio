
import React, { useEffect, useState } from 'react'
import { listGalleryItems } from '../api'

export default function Hero() {
  const [randomItem, setRandomItem] = useState(null)

  useEffect(() => {
    listGalleryItems().then(data => {
      if (data && data.length > 0) {
        const itemsWithImages = data.filter(item => item.image_path)
        if (itemsWithImages.length > 0) {
          const randomIndex = Math.floor(Math.random() * itemsWithImages.length)
          const chosen = itemsWithImages[randomIndex]
          setRandomItem(chosen)
        }
      }
    })
  }, [])

  return (
    <section
      className="hero"
      style={
        randomItem
          ? { ['--hero-bg']: `url(${randomItem.image_path})` }
          : {}
      }
    >
      <div className="hero-shade">
        <div className="hero-content">
          <h1 className="hero-name">Lisa Schnabel</h1>
          <p className="hero-subtitle">Dream Imagery and Abstraction in Oil and Acrylic</p>
        </div>
        <div className="hero-arrow">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 10 V30" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
            <path d="M12 24 L20 32 L28 24" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </section>
  )
}
