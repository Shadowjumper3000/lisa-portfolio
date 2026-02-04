import React, {useEffect, useState} from 'react'
import { listProjects, createProject, login } from './api'

export default function App(){
  const [projects, setProjects] = useState([])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [imgFile, setImgFile] = useState(null)
  const [token, setToken] = useState('')

  useEffect(()=>{
    listProjects().then(data => setProjects(data || []))
  },[])

  async function handleAdd(e){
    e.preventDefault()
    const p = await createProject({title, description: desc, image: imgFile}, token)
    setProjects(prev=>[p, ...prev])
    setTitle(''); setDesc(''); setImgFile(null)
    // Clear file input
    const fileInput = document.getElementById('imageInput')
    if (fileInput) fileInput.value = ''
  }

  async function handleLogin(){
    const t = await login({username:'admin', password:'password'})
    setToken(t?.token || '')
  }

  return (
    <div style={{padding:20}}>
      <h1>Art Projects</h1>
      <button onClick={handleLogin}>Auto-login (dev)</button>
      <form onSubmit={handleAdd} style={{marginTop:20}}>
        <input placeholder="title" value={title} onChange={e=>setTitle(e.target.value)} />
        <br />
        <input 
          id="imageInput"
          type="file" 
          accept="image/*" 
          onChange={e=>setImgFile(e.target.files[0])} 
        />
        <br />
        <textarea placeholder="description" value={desc} onChange={e=>setDesc(e.target.value)} />
        <br />
        <button type="submit" disabled={!token}>Add Project</button>
      </form>

      <ul>
        {projects.map(p=> (
          <li key={p.id} style={{marginTop:10}}>
            <strong>{p.title}</strong><br/>
            <em>{p.description}</em><br/>
            {p.image_path && <img src={p.image_path} alt={p.title} style={{maxWidth:200}}/>}
          </li>
        ))}
      </ul>
    </div>
  )
}
