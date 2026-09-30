'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Search, X } from 'lucide-react'
import { feedPosts, people } from '@/lib/people'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!normalized) return { people, posts: feedPosts }
    return {
      people: people.filter((person) => [person.name, person.role, person.location, ...person.tags].join(' ').toLowerCase().includes(normalized)),
      posts: feedPosts.filter((post) => [post.title, post.body, post.author, post.type, post.eyebrow].join(' ').toLowerCase().includes(normalized)),
    }
  }, [normalized])
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
        <span>{total} traces</span>
      </section>
      <section className="search-results" aria-live="polite">
        {results.people.length > 0 && <div className="result-group"><div className="result-heading"><span>People</span><span>{results.people.length.toString().padStart(2, '0')}</span></div><div className="people-results">{results.people.map((person) => <Link href={`/profile/${person.slug}`} className="search-person" key={person.slug}><div className="search-person-image"><img src={person.image} alt="" /></div><div><span>{person.role} / {person.location}</span><h2>{person.name}</h2><p>{person.statement}</p></div><ArrowUpRight size={17} /></Link>)}</div></div>}
        {results.posts.length > 0 && <div className="result-group"><div className="result-heading"><span>Notes & memories</span><span>{results.posts.length.toString().padStart(2, '0')}</span></div><div className="post-results">{results.posts.map((post) => <Link href={`/profile/${post.authorSlug}`} className={`search-post search-post-${post.type}`} key={post.id}><div><span>{post.type} / {post.date}</span><h2>{post.title}</h2><p>{post.author} — {post.body.split('\n')[0]}</p></div><ArrowUpRight size={17} /></Link>)}</div></div>}
        {total === 0 && <div className="search-empty"><span>Nothing found</span><h2>Try a softer word.</h2><p>Search by name, place, feeling, or memory.</p></div>}
      </section>
      <footer className="search-footer"><span>Aura / 2026</span><span>Every trace leads somewhere</span></footer>
    </main>
  )
}
