'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Eye, Search, Share2, Star, Plus } from 'lucide-react'
import { feedPosts, people } from '@/lib/people'

function PixelImage({ src, alt, loading = 'lazy' }: { src: string; alt: string; loading?: 'lazy' | 'eager' }) {
  const [loaded, setLoaded] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (imageRef.current?.complete && imageRef.current.naturalWidth > 0) setLoaded(true)
  }, [src])

  return (
    <span className={`pixel-image ${loaded ? 'is-loaded' : ''}`}>
      <span className="pixel-image-skeleton" aria-hidden="true" />
      <span className="pixel-image-noise" aria-hidden="true" />
      <span className="pixel-image-label" aria-hidden="true">decoding</span>
      <img ref={imageRef} src={src} alt={alt} loading={loading} decoding="async" onLoad={() => setLoaded(true)} />
    </span>
  )
}

function PostSkeleton() {
  return <div className="post-skeleton" aria-hidden="true"><span /><span /><span /></div>
}

export default function Page() {
  const [postsReady, setPostsReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setPostsReady(true), 420)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className="aura-feed">
      <header className="aura-bar">
        <Link href="/" className="aura-logo">Aura<span>.</span></Link>
        <div className="aura-bar-meta"><span>People</span><span>Digital memory archive</span></div>
        <div className="aura-bar-actions"><Link href="/create" className="create-link" aria-label="Create a post"><Plus size={18} /></Link><Link href="/search" className="aura-search" aria-label="Search people"><Search size={16} /></Link><Link href="/profile" className="aura-profile-avatar" aria-label="Open your profile"><img src="/images/portrait.png" alt="Your profile" /></Link></div>
      </header>
      <section className={`people-feed ${postsReady ? 'posts-ready' : 'posts-loading'}`} aria-label="Aura feed" aria-busy={!postsReady}>
        {!postsReady && <div className="post-skeleton-list"><PostSkeleton /><PostSkeleton /><PostSkeleton /></div>}
        {feedPosts.map((post, index) => (
          <article className={`person-row feed-post feed-post-${post.type}`} key={post.id}>
            {post.type === 'quote' || post.type === 'poem' || post.type === 'note' ? <div className={`literary-card literary-card-${post.type}`}><div className="literary-card-top"><span className="post-type">{post.type}</span><span>{post.date}</span></div><span className="literary-mark" aria-hidden="true">{post.type === 'quote' ? '“' : post.type === 'poem' ? '∿' : '—'}</span><h2>{post.title}</h2><p className="literary-body">{post.body}</p><Link href={`/profile/${post.authorSlug}`} className={`post-author ${post.type === 'note' ? 'post-author-note' : ''}`}>{post.type !== 'note' && <img src={post.image} alt="" />} <span>{post.author}</span></Link><div className="person-actions"><span className="person-view-count person-view-count-action"><Eye size={13} aria-hidden="true" /> <span className="sr-only">{post.views} views</span><span>{post.views}</span></span><button className="star-button" type="button" onClick={(event) => event.preventDefault()}><Star size={14} fill="currentColor" /> <span>Star</span><strong>{post.stars}</strong></button><span className="person-share-count"><Share2 size={13} aria-hidden="true" /><span className="sr-only">{post.shares} shares</span><span>{post.shares}</span></span></div></div> : <><Link href={`/profile/${post.authorSlug}`} className="person-image-wrap"><span className="person-aura" />{post.type === 'album' ? <span className="album-strip">{[...(post.images ?? [post.image]), ...(post.images ?? [post.image])].map((image, imageIndex) => <PixelImage key={`${image}-${imageIndex}`} src={image} alt={`${post.title}, frame ${imageIndex + 1}`} loading="lazy" />)}</span> : <PixelImage src={post.image} alt={`${post.author} — ${post.title}`} loading={index > 1 ? 'lazy' : 'eager'} />}</Link><div className="person-copy"><div className="person-copy-top"><span className="post-type">{post.type}</span><span className="person-share-count">{post.date}</span></div><p className="person-role">{post.eyebrow}</p><h2>{post.title}</h2><p className="person-statement">{post.body}</p><Link href={`/profile/${post.authorSlug}`} className="post-author"><img src={post.image} alt="" /> <span>{post.author}</span></Link><div className="person-actions"><span className="person-view-count person-view-count-action"><Eye size={13} aria-hidden="true" /> <span className="sr-only">{post.views} views</span><span>{post.views}</span></span><button className="star-button" type="button" onClick={(event) => event.preventDefault()}><Star size={14} fill="currentColor" /> <span>Star</span><strong>{post.stars}</strong></button><span className="person-share-count"><Share2 size={13} aria-hidden="true" /><span className="sr-only">{post.shares} shares</span><span>{post.shares}</span></span></div></div></>}
          </article>
        ))}
        {people.map((person, index) => (
          <Link href={`/profile/${person.slug}`} className={`person-row person-row-${index + 1}`} key={person.slug}>
            <div className="person-image-wrap"><span className="person-aura" /><PixelImage src={person.image} alt={`${person.name} portrait`} loading="lazy" /></div>
            <div className="person-copy"><div className="person-copy-top"><span className="post-type">profile</span><span className="person-share-count"><Share2 size={13} aria-hidden="true" /><span className="sr-only">{person.shares} shares</span><span>{person.shares}</span></span></div><p className="person-role">{person.role} / {person.location}</p><h2>{person.name}</h2><p className="person-statement">{person.statement}</p><div className="person-tags">{person.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="person-actions"><span className="person-view-count person-view-count-action"><Eye size={13} aria-hidden="true" /><span className="sr-only">{person.views} views</span><span>{person.views}</span></span><button className="star-button" type="button" onClick={(event) => event.preventDefault()}><Star size={14} fill="currentColor" /> <span>Star</span><strong>{person.stars}</strong></button></div></div>
          </Link>
        ))}
      </section>
    </main>
  )
}
