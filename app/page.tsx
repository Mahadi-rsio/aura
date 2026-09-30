'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { people } from '@/lib/people'

export default function Page() {
  return (
    <main className="aura-feed">
      <header className="aura-bar">
        <Link href="/" className="aura-logo">Aura<span>.</span></Link>
        <div className="aura-bar-meta"><span>People</span><span>Digital memory archive</span></div>
        <button className="aura-search" aria-label="Search people"><Search size={16} /></button>
      </header>
      <section className="people-feed" aria-label="People on Aura">
        {people.map((person, index) => (
          <Link href={`/profile/${person.slug}`} className={`person-row person-row-${index + 1}`} key={person.slug}>
            <div className="person-image-wrap"><span className="person-aura" /><button className="image-star" type="button" aria-label={`Star ${person.name}`} onClick={(event) => event.preventDefault()}>★</button><img src={person.image} alt={`${person.name} portrait`} loading={index > 1 ? 'lazy' : 'eager'} /></div>
            <div className="person-copy"><p className="person-role">{person.role} / {person.location}</p><h2>{person.name}</h2><p className="person-statement">{person.statement}</p><div className="person-tags">{person.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="person-actions"><button type="button" onClick={(event) => event.preventDefault()}>Follow</button><span className="start-button">Start</span></div></div>
          </Link>
        ))}
      </section>
      <footer className="feed-footer"><span>Aura / 2026</span><span>Made for the in-between</span><span>Scroll to discover</span></footer>
    </main>
  )
}
