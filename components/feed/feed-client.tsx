'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Eye, Search, Share2, Star, Plus } from 'lucide-react'
import type { FeedPostView } from '@/lib/mappers'
import type { Person } from '@/lib/people'
import { useFeedStore } from '@/store/feed'

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

export default function FeedClient({ initialPosts, initialPeople }: { initialPosts: FeedPostView[]; initialPeople: Person[] }) {
  const posts = useFeedStore((state) => state.posts)
  const people = useFeedStore((state) => state.people)
  const error = useFeedStore((state) => state.error)
  const hasMore = useFeedStore((state) => state.hasMore)
  const loadingMore = useFeedStore((state) => state.loadingMore)
  const hydrate = useFeedStore((state) => state.hydrate)
  const loadMore = useFeedStore((state) => state.loadMore)
  const toggleStar = useFeedStore((state) => state.toggleStar)
  const share = useFeedStore((state) => state.share)

  const list = posts.length ? posts : initialPosts
  const peopleList = people.length ? people : initialPeople
  const [postsReady, setPostsReady] = useState(list.length === 0)

  useEffect(() => {
    hydrate(initialPosts, initialPeople)
  }, [initialPosts, initialPeople, hydrate])

  useEffect(() => {
    if (postsReady) return
    const timer = window.setTimeout(() => setPostsReady(true), 420)
    return () => window.clearTimeout(timer)
  }, [postsReady])

  return (
    <main className="aura-feed">
      <header className="aura-bar">
        <Link href="/" className="aura-logo">Aura<span>.</span></Link>
        <div className="aura-bar-meta"><span>People</span><span>Digital memory archive</span></div>
        <div className="aura-bar-actions">
          <Link href="/create" className="create-link" aria-label="Create a post"><Plus size={18} /></Link>
          <Link href="/search" className="aura-search" aria-label="Search people"><Search size={16} /></Link>
          <Link href="/profile" className="aura-profile-avatar" aria-label="Open your profile"><img src="/images/portrait.png" alt="Your profile" /></Link>
        </div>
      </header>
      <section className={`people-feed ${postsReady ? 'posts-ready' : 'posts-loading'}`} aria-label="Aura feed" aria-busy={!postsReady}>
        {!postsReady && <div className="post-skeleton-list"><PostSkeleton /><PostSkeleton /><PostSkeleton /></div>}
        {error && <p className="feed-error" role="alert">{error}</p>}
        {list.map((post, index) => (
          <article className={`person-row feed-post feed-post-${post.type}`} key={post.id}>
            {post.type === 'quote' || post.type === 'poem' || post.type === 'note' ? <div className={`literary-card literary-card-${post.type}`}><div className="literary-card-top"><span className="post-type">{post.type}</span><span>{post.date}</span></div><span className="literary-mark" aria-hidden="true">{post.type === 'quote' ? '“' : post.type === 'poem' ? '∿' : '—'}</span><h2>{post.title}</h2><p className="literary-body">{post.body}</p><Link href={`/profile/${post.authorSlug}`} className={`post-author ${post.type === 'note' ? 'post-author-note' : ''}`}>{post.type !== 'note' && post.image && <img src={post.image} alt="" />} <span>{post.author}</span></Link><div className="person-actions"><span className="person-view-count person-view-count-action"><Eye size={13} aria-hidden="true" /> <span className="sr-only">{post.views} views</span><span>{post.views}</span></span><button className={`star-button ${post.starred ? 'is-selected' : ''}`} type="button" onClick={() => void toggleStar(post.id)} aria-pressed={post.starred}><Star size={14} fill="currentColor" /> <span>Star</span><strong>{post.stars}</strong></button><button className="person-share-count" type="button" onClick={() => void share(post.id)}><Share2 size={13} aria-hidden="true" /><span className="sr-only">{post.shares} shares</span><span>{post.shares}</span></button></div></div> : <><Link href={`/profile/${post.authorSlug}`} className="person-image-wrap"><span className="person-aura" />{post.type === 'album' ? <span className="album-strip">{[...(post.images ?? (post.image ? [post.image] : [])), ...(post.images ?? (post.image ? [post.image] : []))].map((image, imageIndex) => <PixelImage key={`${image}-${imageIndex}`} src={image} alt={`${post.title}, frame ${imageIndex + 1}`} loading="lazy" />)}</span> : post.image ? <PixelImage src={post.image} alt={`${post.author} — ${post.title}`} loading={index > 1 ? 'lazy' : 'eager'} /> : null}</Link><div className="person-copy"><div className="person-copy-top"><span className="post-type">{post.type}</span><span className="person-share-count">{post.date}</span></div><p className="person-role">{post.eyebrow}</p><h2>{post.title}</h2><p className="person-statement">{post.body}</p><Link href={`/post/${post.slug}`} className="post-author">{post.image && <img src={post.image} alt="" />} <span>{post.author}</span></Link><div className="person-actions"><span className="person-view-count person-view-count-action"><Eye size={13} aria-hidden="true" /> <span className="sr-only">{post.views} views</span><span>{post.views}</span></span><button className={`star-button ${post.starred ? 'is-selected' : ''}`} type="button" onClick={() => void toggleStar(post.id)} aria-pressed={post.starred}><Star size={14} fill="currentColor" /> <span>Star</span><strong>{post.stars}</strong></button><button className="person-share-count" type="button" onClick={() => void share(post.id)}><Share2 size={13} aria-hidden="true" /><span className="sr-only">{post.shares} shares</span><span>{post.shares}</span></button></div></div></>}
          </article>
        ))}
        {hasMore && (
          <div className="feed-end">
            <button type="button" className="create-image-button" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load older entries'}
            </button>
          </div>
        )}
        {peopleList.map((person, index) => (
          <Link href={`/profile/${person.slug}`} className={`person-row person-row-${index + 1}`} key={person.slug}>
            <div className="person-image-wrap"><span className="person-aura" /><PixelImage src={person.image} alt={`${person.name} portrait`} loading="lazy" /></div>
            <div className="person-copy"><div className="person-copy-top"><span className="post-type">profile</span><span className="person-share-count"><Share2 size={13} aria-hidden="true" /><span className="sr-only">{person.shares} shares</span><span>{person.shares}</span></span></div><p className="person-role">{person.role} / {person.location}</p><h2>{person.name}</h2><p className="person-statement">{person.statement}</p><div className="person-tags">{person.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="person-actions"><span className="person-view-count person-view-count-action"><Eye size={13} aria-hidden="true" /><span className="sr-only">{person.views} views</span><span>{person.views}</span></span><span className="star-button" aria-hidden="true"><Star size={14} fill="currentColor" /> <span>Stars</span><strong>{person.stars}</strong></span></div></div>
          </Link>
        ))}
      </section>
    </main>
  )
}