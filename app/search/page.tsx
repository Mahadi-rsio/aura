'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Search, X } from 'lucide-react'
import { ApiError, search } from '@/lib/client-api'
import type { PostSearchResult, SearchResult } from '@/lib/mappers'

type Results = { people: SearchResult[]; posts: PostSearchResult[] }

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Results>({ people: [], posts: [] })
  const [loading, setLoading] = useState(false)
  const [idle, setIdle] = useState(true)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const trimmed = query.trim()
    if (!trimmed) {
      setResults({ people: [], posts: [] })
      setIdle(true)
      return
    }
    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const data = await search(trimmed)
        if (!cancelled) {
          setResults(data)
          setIdle(false)
        }
      } catch (error) {
        if (!cancelled) {
          setResults({ people: [], posts: [] })
          setIdle(false)
          if (!(error instanceof ApiError)) console.error(error)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  const total = results.people.length + results.posts.length

  return (
    <main className="search-page">
      <header className="search-header">
        <Link href="/" className="search-back" aria-label="Back to feed"><ArrowLeft size={15} /> <span>Feed</span></Link>
        <Link href="/" className="aura-logo">Aura<span>.</span></Link>
        <span className="search-header-note">Find a trace</span>
      </header>
      <section className="search-intro">
        <p className="search-kicker">The archive / search</p>
        <h1>Look<br /><em>closer.</em></h1>
        <p className="search-description">Search the people, memories, feelings, and words held inside Aura.</p>
      </section>
      <section className="search-tool" aria-label="Search archive">
        <Search size={19} aria-hidden="true" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the archive" aria-label="Search the archive" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={17} /></button>}
        <span>{idle ? 'Archive' : `${total} traces`}</span>
      </section>
      <section className="search-results" aria-live="polite">
        {loading && <div className="post-skeleton-list" aria-hidden="true"><div className="post-skeleton"><span /><span /><span /></div><div className="post-skeleton"><span /><span /><span /></div></div>}
        {!loading && results.people.length > 0 && <div className="result-group"><div className="result-heading"><span>People</span><span>{results.people.length.toString().padStart(2, '0')}</span></div><div className="people-results">{results.people.map((person) => <Link href={`/profile/${person.slug}`} className="search-person" key={person.slug}><div className="search-person-image"><img src={person.image} alt="" /></div><div><span>{person.role} / {person.location}</span><h2>{person.name}</h2><p>{person.statement}</p></div><ArrowUpRight size={17} /></Link>)}</div></div>}
        {!loading && results.posts.length > 0 && <div className="result-group"><div className="result-heading"><span>Notes & memories</span><span>{results.posts.length.toString().padStart(2, '0')}</span></div><div className="post-results">{results.posts.map((post) => <Link href={`/post/${post.slug}`} className={`search-post search-post-${post.type}`} key={post.id}><div><span>{post.type} / {post.date}</span><h2>{post.title}</h2><p>{post.author} — {post.body.split('\n')[0]}</p></div><ArrowUpRight size={17} /></Link>)}</div></div>}
        {!loading && !idle && total === 0 && <div className="search-empty"><span>Nothing found</span><h2>Try a softer word.</h2><p>Search by name, place, feeling, or memory.</p></div>}
        {!loading && idle && <div className="search-empty"><span>The whole archive</span><h2>Begin with a word.</h2><p>A name, a place, a feeling — anything you remember.</p></div>}
      </section>
      <footer className="search-footer"><span>Aura / 2026</span><span>Every trace leads somewhere</span></footer>
    </main>
  )
}