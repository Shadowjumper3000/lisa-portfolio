import React, { useEffect } from 'react'

export default function ImageModal({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!item) return null

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal" onClick={e => e.stopPropagation()}>
        <button className="image-modal-close" onClick={onClose}>✕</button>
        <div className="image-modal-split">
          <div className="image-modal-left">
            <div className="image-modal-left-inner">
              <img src={item.image_path} alt={item.title} />
            </div>
          </div>
            <div className="image-modal-right">
              <div className="image-modal-info">
                <h2>{item.title}</h2>
                {item.year && <div className="modal-year">{item.year}</div>}
                {item.info && <p className="modal-info"><strong>Info:</strong> {item.info}</p>}
                {item.description && <p className="modal-description"><strong>Description:</strong> {item.description}</p>}
                {item.story && <p className="modal-story"><strong>Story:</strong> {item.story}</p>}
                {item.medium && <p><strong>Medium:</strong> {item.medium}</p>}
                {item.dimensions && <p><strong>Dimensions:</strong> {item.dimensions}</p>}
                {item.notes && <p className="modal-notes">{item.notes}</p>}
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}
