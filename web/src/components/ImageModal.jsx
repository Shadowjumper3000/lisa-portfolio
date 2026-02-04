import React, { useEffect } from 'react'

export default function ImageModal({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!item) return null

  const imageSrc = item.image_path || item.imagePath || item.image || ''
  const year = item.year || item.yearCreated || ''

  // Keys we already render explicitly so we don't duplicate them below
  const explicitKeys = new Set(['id','title','image_path','imagePath','image','year','yearCreated','created_at','info','description','story','medium','dimensions','notes'])

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal" onClick={e => e.stopPropagation()}>
        <button className="image-modal-close" onClick={onClose}>✕</button>
        <div className="image-modal-split">
          <div className="image-modal-left">
            <div className="image-modal-left-inner">
              <img src={imageSrc} alt={item.title || 'image'} />
            </div>
          </div>
          <div className="image-modal-right">
            <div className="image-modal-info">
              <h2>{item.title || 'Untitled'}</h2>
              {year && <div className="modal-year">{year}</div>}

              {item.info && <italic><p className="modal-info">{item.info}</p></italic>}
              {item.description && <italic><p className="modal-description">{item.description}</p></italic>}
              {item.story && <p className="modal-story">{item.story}</p>}
              {item.medium && <p><strong>Medium:</strong> {item.medium}</p>}
              {item.dimensions && <p><strong>Dimensions:</strong> {item.dimensions}</p>}
              {item.notes && <p className="modal-notes">{item.notes}</p>}

              {/* Render any other fields present on the item object */}
              {Object.keys(item).filter(k => !explicitKeys.has(k)).length > 0 && (
                <div className="modal-extra">
                  <h4>More details</h4>
                  {Object.keys(item).filter(k => !explicitKeys.has(k)).map(key => (
                    item[key] ? (
                      <p key={key}><strong>{key.replace(/_/g, ' ')}:</strong> {String(item[key])}</p>
                    ) : null
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
