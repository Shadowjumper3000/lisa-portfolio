import React, { useState } from 'react'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: Add form submission logic here
    console.log('Form submitted:', formData)
  }

  return (
    <section className="section contact-section">
      <div className="contact-container">
        <div className="contact-header">
          <h2>Get In Touch</h2>
          <p className="description">
            I'm always interested in hearing about new projects and opportunities.
          </p>
          <div className="contact-details">
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:hello@lisaportfolio.com" className="contact-link">
              hello@lisaportfolio.com
            </a>
          </p>
        <p>
          <strong>Location:</strong> Available for remote work worldwide
        </p>
      </div>
        </div>        
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Your name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your.email@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              placeholder="Your message..."
              rows="5"
            />
          </div>

          <button type="submit" className="submit-btn">Send Message</button>
        </form>
      </div>
    </section>
  )
}
