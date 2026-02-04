import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listGalleryItems } from '../api'
import ImageModal from './ImageModal'

export default function GalleryPreview() {
  const [items, setItems] = useState([])
  const [modalItem, setModalItem] = useState(null)

  useEffect(() => {
    listGalleryItems().then(data => {
      // Show only first 3 items as preview
      setItems((data || []).slice(0, 3))
    })
  }, [])

  return (
    <section className="section">
      <div className="section-header">
        <h2>Featured Work</h2>
        <Link to="/gallery" className="link-button">View All →</Link>
      </div>
      <div className="gallery-grid">
        {items.length === 0 ? (
          <p className="empty-message">No gallery items yet.</p>
        ) : (
          items.map(item => (
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
            </div>
          ))
        )}
      </div>
      <ImageModal item={modalItem} onClose={() => setModalItem(null)} />
    </section>
  )
}
