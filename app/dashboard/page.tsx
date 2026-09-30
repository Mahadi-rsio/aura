'use client'

import './dashboard.css'
import { FormEvent, useState } from 'react'
import { ArrowUpRight, Check, ImagePlus, LockKeyhole, LoaderCircle, Save } from 'lucide-react'

const sections = ['Hero cover', 'Portrait', 'Memory archive', 'Memory reel', 'Timeline', 'Gallery']
const initialCopy = { title: '', description: '', location: '', date: '' }

export default function DashboardPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [section, setSection] = useState('Memory archive')
  const [file, setFile] = useState<File | null>(null)
  const [copy, setCopy] = useState(initialCopy)
  const [message, setMessage] = useState('')
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [busy, setBusy] = useState(false)

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    setBusy(false)
    if (response.ok) { setAuthenticated(true); setMessage('Access granted') } else setMessage('That password is not correct')
  }

  async function upload(event: FormEvent) {
    event.preventDefault(); if (!file) return setMessage('Choose an image first')
    setBusy(true); setMessage('Uploading to MinIO…'); setUploadedUrl('')
    const body = new FormData(); body.append('file', file); body.append('section', section)
    try {
      const response = await fetch('/api/admin/upload', { method: 'POST', body })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Upload failed')
      setUploadedUrl(data.url); setMessage('Image uploaded successfully'); setFile(null)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed') } finally { setBusy(false) }
  }

  async function saveContent(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('Saving content…')
    try {
      const response = await fetch('/api/admin/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section, content: copy }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not save content')
      setMessage('Content saved successfully')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save content') } finally { setBusy(false) }
  }

  if (!authenticated) return <main className="dashboard-shell"><div className="dashboard-login"><span className="dashboard-mark">AN<span>.</span></span><LockKeyhole size={24} strokeWidth={1} /><p className="section-kicker">Private archive / dashboard</p><h1>Enter the archive.</h1><form onSubmit={login}><label htmlFor="password">Password</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /><button type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : 'Unlock'} <ArrowUpRight size={15} /></button></form>{message && <p className="dashboard-message">{message}</p>}<a href="/">Return to biography</a></div></main>

  return <main className="dashboard-shell"><div className="dashboard-header"><a href="/" className="dashboard-mark">AN<span>.</span></a><span className="dashboard-status"><Check size={13} /> MinIO + Neon connected</span><a href="/">View biography <ArrowUpRight size={14} /></a></div><section className="dashboard-content"><p className="section-kicker">Archive control / 001</p><h1>Keep the archive<br /><em>alive.</em></h1><p className="dashboard-intro">Upload photographs and update the words that travel with each memory.</p><div className="dashboard-grid"><form className="upload-panel" onSubmit={upload}><div className="upload-field"><label htmlFor="section">Destination</label><select id="section" value={section} onChange={(event) => setSection(event.target.value)}>{sections.map((item) => <option key={item}>{item}</option>)}</select></div><label className="dropzone" htmlFor="image"><ImagePlus size={28} strokeWidth={1} /><strong>{file ? file.name : 'Choose a photograph'}</strong><span>PNG, JPG or WEBP · 10MB maximum</span><input id="image" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><button type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={15} /> Uploading…</> : <>Upload image <ArrowUpRight size={15} /></>}</button></form><form className="upload-panel content-panel" onSubmit={saveContent}><div className="panel-heading"><span className="section-kicker">Content update</span><Save size={17} /></div><p className="panel-note">Save the caption and metadata for this section.</p><label>Title<input value={copy.title} onChange={(event) => setCopy({ ...copy, title: event.target.value })} placeholder="A short memory title" /></label><label>Description<textarea value={copy.description} onChange={(event) => setCopy({ ...copy, description: event.target.value })} placeholder="The story behind this image" rows={4} /></label><div className="content-row"><label>Date<input value={copy.date} onChange={(event) => setCopy({ ...copy, date: event.target.value })} placeholder="2024" /></label><label>Location<input value={copy.location} onChange={(event) => setCopy({ ...copy, location: event.target.value })} placeholder="Lisbon" /></label></div><button type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={15} /> Saving…</> : <>Save content <Check size={15} /></>}</button></form></div>{message && <p className="dashboard-message">{message}</p>}{uploadedUrl && <a className="uploaded-link" href={uploadedUrl} target="_blank" rel="noreferrer">Open uploaded image <ArrowUpRight size={14} /></a>}</section></main>
}
