const API_BASE = (import.meta.env.VITE_API_BASE) || ''

export async function listGalleryItems(){
  const res = await fetch(`${API_BASE}/api/gallery`)
  if(!res.ok) return []
  return res.json()
}

export async function createGalleryItem(data, token){
  const formData = new FormData()
  formData.append('title', data.title)
  formData.append('description', data.description)
  if (data.image) {
    formData.append('image', data.image)
  }
  
  const res = await fetch(`${API_BASE}/api/gallery`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  })
  return res.json()
}

export async function login(creds){
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(creds)
  })
  if(!res.ok) return null
  return res.json()
}
