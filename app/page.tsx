'use client'

import Link from 'next/link'
import { ArrowUpRight, Search } from 'lucide-react'
import { people } from '@/lib/people'

export default function Page() {
  return (
    <main className="aura-feed">
      <header className="aura-bar">
        <Link href="/" className="aura-logo">Aura<span>.</span></Link>
        <div className="aura-bar-meta"><span>People / 05</span><span>Digital memory archive</span></div>
        <button className="aura-search" aria-label="Search people"><Search size={16} /></button>
      </header>
      <section className="feed-intro">
        <p className="feed-kicker">A living collection of people</p>
        <h1>Lives worth<br /><em>remembering.</em></h1>
        <p className="feed-description">Aura is a quiet place for personal stories, images, and the details that make a life feel like itself.</p>
      </section>
      <section className="people-feed" aria-label="People on Aura">
        {people.map((person, index) => (
          <Link href={`/profile/${person.slug}`} className={`person-row person-row-${index + 1}`} key={person.slug}>
            <div className="person-index">{person.accent}</div>
            <div className="person-image-wrap"><span className="person-aura" /><img src={person.image} alt={`${person.name} portrait`} loading={index > 1 ? 'lazy' : 'eager'} /></div>
            <div className="person-copy"><p className="person-role">{person.role} / {person.location}</p><h2>{person.name}</h2><p className="person-statement">{person.statement}</p><div className="person-tags">{person.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
            <span className="person-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
          </Link>
        ))}
      </section>
      <footer className="feed-footer"><span>Aura / 2026</span><span>Made for the in-between</span><span>Scroll to discover</span></footer>
    </main>
  )
}
