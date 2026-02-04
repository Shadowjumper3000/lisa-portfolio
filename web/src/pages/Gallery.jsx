import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listGalleryItems } from '../api'

export default function Gallery() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listGalleryItems()
      .then(data => {
        setItems(data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1 className="page-title">Gallery</h1>
        <p className="page-subtitle">A complete collection of my work</p>
      </div>

      {loading ? (
        <div className="loading">Loading gallery...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>No items in the gallery yet.</p>
        </div>
      ) : (
        <div className="gallery-grid-full">
          {items.map(item => (
            <div key={item.id} className="gallery-card">
              {item.image_path && (
                <div className="gallery-image-container">
                  <img src={item.image_path} alt={item.title} className="gallery-image" />
                </div>
              )}
              <div className="gallery-content">
                <h3 className="gallery-title">{item.title}</h3>
                {item.abstract && (
                  <p className="gallery-abstract"><strong>Abstract:</strong> {item.abstract}</p>
                )}
                {item.story && (
                  <p className="gallery-story"><strong>Story:</strong> {item.story}</p>
                )}
                {item.description && (
                  <p className="gallery-description">{item.description}</p>
                )}
                <p className="gallery-date">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="footer">
        <Link to="/" className="footer-link">Return to Home</Link>
      </footer>
    </div>
  )
}
