import React, { useEffect, useState } from 'react'
import { listGalleryItems } from '../api'
import ImageModal from './ImageModal'

export default function Hero() {
  const [randomItem, setRandomItem] = useState(null)

  useEffect(() => {
    listGalleryItems().then(data => {
      if (data && data.length > 0) {
        // Filter items that have images
        const itemsWithImages = data.filter(item => item.image_path)
        if (itemsWithImages.length > 0) {
          // Select a random item
          const randomIndex = Math.floor(Math.random() * itemsWithImages.length)
          const chosen = itemsWithImages[randomIndex]
          setRandomItem(chosen)
          try {
            localStorage.setItem('heroImage', chosen.image_path)
          } catch (e) {
            // ignore localStorage errors
          }
        }
      }
    })
  }, [])

  const [modalOpen, setModalOpen] = useState(false)

  return (
    <section className="hero">
      <div className="hero-content">
        <h1 className="title">Lisa Schnabel</h1>
        <p className="subtitle">Dream Imagery and Abstraction in Oil and Acrylic</p>
      </div>
      {randomItem && (
        <div className="hero-image" onClick={() => setModalOpen(true)} role="button" tabIndex={0}>
          <img src={randomItem.image_path} alt={randomItem.title} />
          <div className="image-meta-plaintext">
            {[
              randomItem.title,
              randomItem.info || randomItem.description,
              randomItem.year || randomItem.yearCreated
            ].filter(Boolean).join(' • ')}
          </div>
        </div>
      )}
      <ImageModal item={modalOpen ? randomItem : null} onClose={() => setModalOpen(false)} />
    </section>
  )
}
