import React from 'react'
import Hero from '../components/Hero'
import About from '../components/About'
import GalleryPreview from '../components/GalleryPreview'
import Contact from '../components/Contact'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <div className="page">
      <Hero />
      <About />
      <GalleryPreview />
      <Contact />
      <Footer />
    </div>
  )
}
