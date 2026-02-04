import React, { useEffect, useState } from 'react'
import { listGalleryItems } from '../api'

export default function About() {
  const [featuredItem, setFeaturedItem] = useState(null)

  useEffect(() => {
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
  }, [])

  return (
    <>
      <section className="section about-title-section">
        <h2>About Me</h2>
      </section>
      <section 
        className="about-hero-section"
        style={
          featuredItem
            ? { ['--about-bg']: `url(${featuredItem.image_path})` }
            : {}
        }
      >
        <div className="about-shade">
          <div className="about-content">
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
      </section>
    </>
  )
}
