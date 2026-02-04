import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listGalleryItems } from '../api'
import ImageModal from '../components/ImageModal'

export default function Gallery() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalItem, setModalItem] = useState(null)

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
                <>
                  <div className="gallery-image-container clickable" onClick={() => setModalItem(item)}>
                    <img src={item.image_path} alt={item.title} className="gallery-image" />
                  </div>
                  <div className="image-meta-plaintext">
                    {[
                      item.title,
                      item.info || item.description,
                      item.year || item.yearCreated
                    ].filter(Boolean).join(' • ')}
                  </div>
                </>
              )}
              <div className="gallery-content">
                {item.info && (
                  <p className="gallery-abstract"><strong>Info:</strong> {item.info}</p>
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

      <ImageModal item={modalItem} onClose={() => setModalItem(null)} />

      <footer className="footer">
        <Link to="/" className="footer-link">Return to Home</Link>
      </footer>
    </div>
  )
}
