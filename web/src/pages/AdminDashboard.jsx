import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listGalleryItems, createGalleryItem, updateGalleryItem } from '../api'

export default function AdminDashboard() {
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [info, setInfo] = useState('')
  const [story, setStory] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [yearCreated, setYearCreated] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editMessage, setEditMessage] = useState('')
  const navigate = useNavigate()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('adminToken')
    if (!token) {
      navigate('/admin/login')
      return
    }

    // Load gallery items
    loadItems()
  }, [navigate])

  // Add a robots noindex meta tag so search engines won't index this page
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      if (meta.parentNode) meta.parentNode.removeChild(meta)
    }
  }, [])

  const loadItems = async () => {
    const data = await listGalleryItems()
    setItems(data || [])
  }

  const handleEditClick = (item) => {
    setEditMessage('')
    setEditingItem({
      id: item.id,
      title: item.title || '',
      info: item.info || '',
      story: item.story || '',
      description: item.description || '',
      yearCreated: item.yearCreated || '',
      image: null,
      image_path: item.image_path || item.image_path || item.imagePath || ''
    })
    setShowEditModal(true)
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
    setEditMessage('')
  }

  const handleEditChange = (field, value) => {
    setEditingItem(prev => ({ ...prev, [field]: value }))
  }

  const handleEditImageChange = (file) => {
    setEditingItem(prev => ({ ...prev, image: file }))
  }

  const handleSaveEdit = async (e) => {
    e && e.preventDefault()
    if (!editingItem) return
    setEditLoading(true)
    setEditMessage('')
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) { navigate('/admin/login'); return }

      const payload = {
        title: editingItem.title,
        info: editingItem.info,
        story: editingItem.story,
        description: editingItem.description,
        yearCreated: editingItem.yearCreated,
        image: editingItem.image
      }

      const updated = await updateGalleryItem(editingItem.id, payload, token)
      if (updated && updated.id) {
        // Replace item in list
        setItems(prev => prev.map(it => it.id === updated.id ? ({ ...it, ...updated }) : it))
        setEditMessage('Saved successfully')
        setEditingItem(null)
        setShowEditModal(false)
      } else {
        setEditMessage('Failed to save changes')
      }
    } catch (err) {
      setEditMessage('Failed to save changes')
    } finally {
      setEditLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    navigate('/')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        navigate('/admin/login')
        return
      }

      const newItem = await createGalleryItem(
        { title, info, story, description, image: imageFile, yearCreated },
        token
      )

      if (newItem) {
        setItems(prev => [newItem, ...prev])
        setTitle('')
        setInfo('')
        setStory('')
        setDescription('')
        setYearCreated('')
        setImageFile(null)
        setMessage('Item added successfully!')
        
        // Clear file input
        const fileInput = document.getElementById('imageInput')
        if (fileInput) fileInput.value = ''
      }
    } catch (err) {
      setMessage('Failed to add item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <div style={{display: 'flex', gap: '0.75rem'}}>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">Add Item</button>
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
        </div>
      </div>

      <div className="admin-grid">
        {/* Gallery Items List */}
        <section className="admin-section admin-left">
          <h2>Current Gallery Items ({items.length})</h2>
          {items.length === 0 ? (
            <p className="empty-message">No items in gallery yet.</p>
          ) : (
            <div className="admin-gallery-list">
              {items.map(item => (
                <div key={item.id} className="admin-gallery-item">
                  <>
                    <div className="admin-thumbnail">
                      {item.image_path ? <img src={item.image_path} alt={item.title} /> : <div className="thumb-placeholder">No image</div>}
                    </div>
                    <div className="item-actions">
                      <button className="btn-primary" onClick={()=>handleEditClick(item)}>Edit</button>
                    </div>
                    <div className="admin-item-info">
                      <h3>{item.title}</h3>
                      <p><strong>Info:</strong> {item.info}</p>
                      <p><strong>Year Created:</strong> {item.yearCreated || '—'}</p>
                      <p><strong>Story:</strong> {item.story}</p>
                      <p><strong>Description:</strong> {item.description}</p>
                      <p className="item-date">Added: {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
              <h2>Add New Gallery Item</h2>
              <button className="btn-secondary" onClick={()=>setShowAddModal(false)}>Close</button>
            </div>
            <form onSubmit={(e)=>{ handleSubmit(e); setShowAddModal(false); }} className="admin-form">
              {message && (
                <div className={message.includes('success') ? 'success-message' : 'error-message'}>
                  {message}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="title" className="form-label">Title *</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  placeholder="Enter item title"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="info" className="form-label">Info</label>
                <textarea
                  id="info"
                  value={info}
                  onChange={(e) => setInfo(e.target.value)}
                  className="form-textarea"
                  placeholder="Enter a brief info summary"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="yearCreated" className="form-label">Year Created</label>
                <input
                  id="yearCreated"
                  type="number"
                  value={yearCreated}
                  onChange={(e) => setYearCreated(e.target.value)}
                  className="form-input"
                  placeholder="e.g. 2021"
                />
              </div>

              <div className="form-group">
                <label htmlFor="story" className="form-label">Story</label>
                <textarea
                  id="story"
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  className="form-textarea"
                  placeholder="Enter the full story"
                  rows="6"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-textarea"
                  placeholder="Enter item description"
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label htmlFor="imageInput" className="form-label">Image</label>
                <input
                  id="imageInput"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="form-input-file"
                />
                {imageFile && (
                  <p className="file-name">Selected: {imageFile.name}</p>
                )}
              </div>

              <div style={{display:'flex', gap:'0.5rem'}}>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading || !title}
                >
                  {loading ? 'Adding...' : 'Add to Gallery'}
                </button>
                <button type="button" className="btn-secondary" onClick={()=>setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditingItem(null); }}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem'}}>
              <h2>Edit Gallery Item</h2>
              <button className="btn-secondary" onClick={()=>{ setShowEditModal(false); setEditingItem(null); }}>Close</button>
            </div>
            <form onSubmit={(e)=>{ handleSaveEdit(e); }} className="admin-form">
              {editMessage && (
                <div className={editMessage.includes('success') ? 'success-message' : 'error-message'}>
                  {editMessage}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Title *</label>
                <input value={editingItem.title} onChange={(e)=>handleEditChange('title', e.target.value)} className="form-input" required />
              </div>

              <div className="form-group">
                <label className="form-label">Info</label>
                <textarea value={editingItem.info} onChange={(e)=>handleEditChange('info', e.target.value)} className="form-textarea" rows="3" />
              </div>

              <div className="form-group">
                <label className="form-label">Year Created</label>
                <input type="number" value={editingItem.yearCreated} onChange={(e)=>handleEditChange('yearCreated', e.target.value)} className="form-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Story</label>
                <textarea value={editingItem.story} onChange={(e)=>handleEditChange('story', e.target.value)} className="form-textarea" rows="4" />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea value={editingItem.description} onChange={(e)=>handleEditChange('description', e.target.value)} className="form-textarea" rows="3" />
              </div>

              <div className="form-group">
                <label className="form-label">Image (leave empty to keep)</label>
                <input type="file" accept="image/*" onChange={(e)=>handleEditImageChange(e.target.files[0])} className="form-input-file" />
                {editingItem.image_path && <p className="file-name">Current: <a href={editingItem.image_path} target="_blank" rel="noreferrer">image</a></p>}
              </div>

              <div style={{display:'flex', gap:'0.5rem'}}>
                <button type="submit" className="btn-primary" disabled={editLoading}>{editLoading ? 'Saving...' : 'Save'}</button>
                <button type="button" className="btn-secondary" onClick={()=>{ setShowEditModal(false); setEditingItem(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-footer">
        <a href="/" className="footer-link">View Portfolio</a>
      </div>
    </div>
  )
}
