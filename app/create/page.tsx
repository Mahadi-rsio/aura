'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ImagePlus, Sparkles } from 'lucide-react'

const postTypes = ['feeling', 'memory', 'achievement', 'mood', 'album', 'quote', 'poem'] as const

export default function CreatePage() {
  const [type, setType] = useState<(typeof postTypes)[number]>('memory')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [location, setLocation] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [published, setPublished] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPublished(true)
  }

  return (
    <main className="create-page">
      <header className="create-header">
        <Link href="/" className="create-back"><ArrowLeft size={15} /> Back to Aura</Link>
        <span className="create-header-label">New entry / 2026</span>
      </header>
      <div className="create-layout">
        <section className="create-intro">
          <p className="feed-kicker">The archive grows</p>
          <h1>Make something<br /><em>worth keeping.</em></h1>
          <p className="create-note">A small space for a feeling, a memory, or a sentence that should not disappear.</p>
          <div className="create-mark"><Sparkles size={18} /><span>01 — compose slowly</span></div>
        </section>
        <form className="create-form" onSubmit={handleSubmit}>
          <div className="create-field create-type-field">
            <label>01 / What are you making?</label>
            <div className="type-grid">{postTypes.map((item) => <button key={item} type="button" className={type === item ? 'is-selected' : ''} onClick={() => setType(item)}>{item}</button>)}</div>
          </div>
          <label className="create-field"><span>02 / Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give it a name" required /></label>
          <label className="create-field"><span>03 / The words</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={type === 'poem' ? 'Let the lines breathe.' : 'What should remain?'} rows={6} required /></label>
          <div className="create-split"><label className="create-field"><span>04 / Place or date</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Somewhere / sometime" /></label><label className="create-field"><span>05 / Image URL</span><input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="/images/your-memory.png" /></label></div>
          <div className="create-actions"><button className="create-image-button" type="button"><ImagePlus size={16} /> Add image</button><button className="publish-button" type="submit">{published ? 'Saved to Aura' : 'Publish entry'}</button></div>
          {published && <p className="create-success" role="status">Your entry is ready for the archive.</p>}
        </form>
      </div>
    </main>
  )
}
