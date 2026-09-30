'use client'

import Link from 'next/link'
import { Search, Star } from 'lucide-react'
import { feedPosts, people } from '@/lib/people'

export default function Page() {
  return (
    <main className="aura-feed">
      <header className="aura-bar">
        <Link href="/" className="aura-logo">Aura<span>.</span></Link>
        <div className="aura-bar-meta"><span>People</span><span>Digital memory archive</span></div>
        <button className="aura-search" aria-label="Search people"><Search size={16} /></button>
      </header>
      <section className="people-feed" aria-label="Aura feed">
        {feedPosts.map((post, index) => (
          <article className={`person-row feed-post feed-post-${post.type}`} key={post.id}>
            <Link href={`/profile/${post.authorSlug}`} className="person-image-wrap"><span className="person-aura" /><img src={post.image} alt={`${post.author} — ${post.title}`} loading={index > 1 ? 'lazy' : 'eager'} /></Link>
            <div className="person-copy"><div className="person-copy-top"><span className="post-type">{post.type}</span><span className="person-share-count">{post.date}</span></div><p className="person-role">{post.eyebrow}</p><h2>{post.title}</h2><p className="person-statement">{post.body}</p><Link href={`/profile/${post.authorSlug}`} className="post-author">{post.author}</Link><div className="person-actions"><span className="person-view-count person-view-count-action">{post.views} views</span><button className="star-button" type="button" onClick={(event) => event.preventDefault()}><Star size={14} fill="currentColor" /> <span>Star</span><strong>{post.stars}</strong></button><span className="person-share-count">{post.shares} shares</span></div></div>
          </article>
        ))}
        {people.map((person, index) => (
          <Link href={`/profile/${person.slug}`} className={`person-row person-row-${index + 1}`} key={person.slug}>
            <div className="person-image-wrap"><span className="person-aura" /><img src={person.image} alt={`${person.name} portrait`} loading="lazy" /></div>
            <div className="person-copy"><div className="person-copy-top"><span className="post-type">profile</span><span className="person-share-count">{person.shares} shares</span></div><p className="person-role">{person.role} / {person.location}</p><h2>{person.name}</h2><p className="person-statement">{person.statement}</p><div className="person-tags">{person.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="person-actions"><span className="person-view-count person-view-count-action">{person.views} views</span><button className="star-button" type="button" onClick={(event) => event.preventDefault()}><Star size={14} fill="currentColor" /> <span>Star</span><strong>{person.stars}</strong></button></div></div>
          </Link>
        ))}
      </section>
      <footer className="feed-footer"><span>Aura / 2026</span><span>Made for the in-between</span><span>Scroll to discover</span></footer>
    </main>
  )
}
