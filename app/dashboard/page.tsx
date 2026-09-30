'use client'

import './dashboard.module.css'
import { FormEvent, useState } from 'react'
import { ArrowUpRight, Check, ImagePlus, LockKeyhole } from 'lucide-react'

const sections = ['Hero cover', 'Portrait', 'Memory archive', 'Memory reel', 'Timeline']

export default function DashboardPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [section, setSection] = useState('Memory archive')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [uploadedUrl, setUploadedUrl] = useState('')

  async function login(event: FormEvent) {
    event.preventDefault()
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    if (response.ok) { setAuthenticated(true); setMessage('Access granted') }
    else setMessage('That password is not correct')
  }

  async function upload(event: FormEvent) {
    event.preventDefault()
    if (!file) return setMessage('Choose an image first')
    const body = new FormData()
    body.append('file', file)
    body.append('section', section)
    const response = await fetch('/api/admin/upload', { method: 'POST', body })
    const data = await response.json()
    if (!response.ok) return setMessage(data.error || 'Upload failed')
    setUploadedUrl(data.url)
    setMessage('Image uploaded to Blob storage')
    setFile(null)
  }

  if (!authenticated) return <main className="dashboard-shell"><div className="dashboard-login"><span className="dashboard-mark">AN<span>.</span></span><LockKeyhole size={24} strokeWidth={1} /><p className="section-kicker">Private archive / dashboard</p><h1>Enter the archive.</h1><form onSubmit={login}><label htmlFor="password">Password</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /><button type="submit">Unlock <ArrowUpRight size={15} /></button></form>{message && <p className="dashboard-message">{message}</p>}<a href="/">Return to biography</a></div></main>

  return <main className="dashboard-shell"><div className="dashboard-header"><a href="/" className="dashboard-mark">AN<span>.</span></a><span className="dashboard-status"><Check size={13} /> Blob connected</span><a href="/">View biography <ArrowUpRight size={14} /></a></div><section className="dashboard-content"><p className="section-kicker">Image library / 001</p><h1>Keep the archive<br /><em>alive.</em></h1><p className="dashboard-intro">Upload photographs for each part of the biography. New images are stored in Vercel Blob with a section label.</p><form className="upload-panel" onSubmit={upload}><div className="upload-field"><label htmlFor="section">Destination</label><select id="section" value={section} onChange={(event) => setSection(event.target.value)}>{sections.map((item) => <option key={item}>{item}</option>)}</select></div><label className="dropzone" htmlFor="image"><ImagePlus size={28} strokeWidth={1} /><strong>{file ? file.name : 'Choose a photograph'}</strong><span>PNG, JPG or WEBP · 10MB maximum</span><input id="image" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><button type="submit">Upload image <ArrowUpRight size={15} /></button>{message && <p className="dashboard-message">{message}</p>}{uploadedUrl && <a className="uploaded-link" href={uploadedUrl} target="_blank" rel="noreferrer">Open uploaded image <ArrowUpRight size={14} /></a>}</form></section></main>
}
