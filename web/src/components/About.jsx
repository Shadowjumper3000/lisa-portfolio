import React, { useEffect, useState } from 'react'
import { listGalleryItems } from '../api'
import ImageModal from './ImageModal'

export default function About() {
  const [featuredItem, setFeaturedItem] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile) return
    listGalleryItems().then(data => {
      const itemsWithImages = (data || []).filter(i => i.image_path)
      if (itemsWithImages.length === 0) return
      let heroImg = null
      try { heroImg = localStorage.getItem('heroImage') } catch (e) {}
      // Filter out hero image
      const candidates = itemsWithImages.filter(i => i.image_path !== heroImg)
      const pool = candidates.length > 0 ? candidates : itemsWithImages
      const idx = Math.floor(Math.random() * pool.length)
      setFeaturedItem(pool[idx])
    })
  }, [isMobile])

  return (
    <section className="section">
      <h2>About Me</h2>
      <div className="about-grid">
        {featuredItem && !isMobile && (
          <div className="about-image" onClick={() => setModalOpen(true)} role="button" tabIndex={0}>
            <img src={featuredItem.image_path} alt={featuredItem.title} />
            <div className="image-meta-plaintext">
              {[
                featuredItem.title,
                featuredItem.info || featuredItem.description,
                featuredItem.year
              ].filter(Boolean).join(' • ')}
            </div>
          </div>
        )}
        <div className="about-text">
          <p className="description">
            I'm an American artist based in Hamburg, Germany. 
            Born in Cleveland, Ohio, I earned a BFA from Kent State University 
            with a minor in Art History. 
            My work in oil and acrylic moves between the dreamlike and the 
            abstract. Alongside my studio practice, I've worked as an artist 
            and educator, offering bilingual (German/English) classes and 
            workshops for children. I currently seek opportunities at a 
            bilingual school, where I would teach "Art in English" for 
            students in grades 1–12.
          </p>
          <p className="description">
            I believe in the power of simplicity and the impact of thoughtful design. 
            Each piece in my portfolio represents a journey of exploration and expression.
          </p>
        </div>
      </div>
      <ImageModal item={modalOpen ? featuredItem : null} onClose={() => setModalOpen(false)} />
    </section>
  )
}
