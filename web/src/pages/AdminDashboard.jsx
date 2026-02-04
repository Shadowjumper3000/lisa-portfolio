import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listGalleryItems, createGalleryItem } from '../api'

export default function AdminDashboard() {
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [abstract, setAbstract] = useState('')
  const [story, setStory] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

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

  const loadItems = async () => {
    const data = await listGalleryItems()
    setItems(data || [])
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
        { title, abstract, story, description, image: imageFile },
        token
      )

      if (newItem) {
        setItems(prev => [newItem, ...prev])
        setTitle('')
        setAbstract('')
        setStory('')
        setDescription('')
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
    <div className="page">
      <div className="admin-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <button onClick={handleLogout} className="btn-secondary">
          Logout
        </button>
      </div>

      {/* Add Item Form */}
      <section className="admin-section">
        <h2>Add New Gallery Item</h2>
        <form onSubmit={handleSubmit} className="admin-form">
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
            <label htmlFor="abstract" className="form-label">Abstract</label>
            <textarea
              id="abstract"
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              className="form-textarea"
              placeholder="Enter a brief abstract"
              rows="3"
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

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading || !title}
          >
            {loading ? 'Adding...' : 'Add to Gallery'}
          </button>
        </form>
      </section>

      {/* Gallery Items List */}
      <section className="admin-section">
        <h2>Current Gallery Items ({items.length})</h2>
        {items.length === 0 ? (
          <p className="empty-message">No items in gallery yet.</p>
        ) : (
          <div className="admin-gallery-list">
            {items.map(item => (
              <div key={item.id} className="admin-gallery-item">
                {item.image_path && (
                  <div className="admin-thumbnail">
                    <img src={item.image_path} alt={item.title} />
                  </div>
                )}
                <div className="admin-item-info">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <p className="item-date">
                    Added: {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="admin-footer">
        <a href="/" className="footer-link">View Portfolio</a>
      </div>
    </div>
  )
}
