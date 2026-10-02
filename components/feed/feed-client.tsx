'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Eye, Search, Share2, Star, Plus } from 'lucide-react'
import type { FeedPostView, PersonDirectoryView } from '@/lib/mappers'
import { useFeedStore } from '@/store/feed'
import { toggleFollow } from '@/lib/client-api'
import AccountMenu from '@/components/account/account-menu'
import LoginPrompt from '@/components/account/login-prompt'
import PeopleDirectory from '@/components/feed/people-directory'
import AuraLoader from '@/components/aura-loader'

export type FeedAccount = { name: string; image: string }

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(value)
}

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

function PostActions({ post, onStar, onShare }: { post: FeedPostView; onStar: () => void; onShare: () => void }) {
  return (
    <div className="person-actions">
      <span className="person-view-count person-view-count-action"><Eye size={13} aria-hidden="true" /> <span className="sr-only">{post.views} views</span><span>{post.views}</span></span>
      <button className={`star-button ${post.starred ? 'is-selected' : ''}`} type="button" onClick={onStar} aria-pressed={post.starred}><Star size={14} fill="currentColor" /> <span>Star</span><strong>{post.stars}</strong></button>
      <button className="person-share-count" type="button" onClick={onShare}><Share2 size={13} aria-hidden="true" /><span className="sr-only">{post.shares} shares</span><span>{post.shares}</span></button>
    </div>
  )
}

function PostCard({ post, index, onStar, onShare }: { post: FeedPostView; index: number; onStar: () => void; onShare: () => void }) {
  const literary = post.type === 'quote' || post.type === 'poem' || post.type === 'note'
  return (
    <article className={`person-row feed-post feed-post-${post.type}`}>
      {literary ? (
        <div className={`literary-card literary-card-${post.type}`}>
          <div className="literary-card-top"><span className="post-type">{post.type}</span><span>{post.date}</span></div>
          <span className="literary-mark" aria-hidden="true">{post.type === 'quote' ? '“' : post.type === 'poem' ? '∿' : '—'}</span>
          <h2><Link href={`/post/${post.slug}`}>{post.title}</Link></h2>
          <p className="literary-body">{post.body}</p>
          <Link href={`/profile/${post.authorSlug}`} className={`post-author ${post.type === 'note' ? 'post-author-note' : ''}`}>
            {post.type !== 'note' && post.image && <img src={post.image} alt="" />} <span>{post.author}</span>
          </Link>
          <PostActions post={post} onStar={onStar} onShare={onShare} />
        </div>
      ) : (
        <>
          <Link href={`/profile/${post.authorSlug}`} className="person-image-wrap">
            <span className="person-aura" />
            {post.type === 'album' ? (
              <span className="album-strip">
                {[...(post.images ?? (post.image ? [post.image] : [])), ...(post.images ?? (post.image ? [post.image] : []))].map((image, imageIndex) => (
                  <PixelImage key={`${image}-${imageIndex}`} src={image} alt={`${post.title}, frame ${imageIndex + 1}`} loading="lazy" />
                ))}
              </span>
            ) : post.image ? (
              <PixelImage src={post.image} alt={`${post.author} — ${post.title}`} loading={index > 1 ? 'lazy' : 'eager'} />
            ) : null}
          </Link>
          <div className="person-copy">
            <div className="person-copy-top"><span className="post-type">{post.type}</span><span className="person-share-count">{post.date}</span></div>
            <p className="person-role">{post.eyebrow}</p>
            <h2><Link href={`/post/${post.slug}`}>{post.title}</Link></h2>
            <p className="person-statement">{post.body}</p>
            <Link href={`/profile/${post.authorSlug}`} className="post-author">{post.image && <img src={post.image} alt="" />}<span>{post.author}</span></Link>
            <PostActions post={post} onStar={onStar} onShare={onShare} />
          </div>
        </>
      )}
    </article>
  )
}

export default function FeedClient({
  initialPosts,
  account,
  initialPeople,
}: {
  initialPosts: FeedPostView[]
  account: FeedAccount | null
  initialPeople: PersonDirectoryView[]
}) {
  const posts = useFeedStore((state) => state.posts)
  const error = useFeedStore((state) => state.error)
  const hasMore = useFeedStore((state) => state.hasMore)
  const loadingMore = useFeedStore((state) => state.loadingMore)
  const hydrate = useFeedStore((state) => state.hydrate)
  const loadMore = useFeedStore((state) => state.loadMore)
  const toggleStar = useFeedStore((state) => state.toggleStar)
  const share = useFeedStore((state) => state.share)

  const list = posts.length ? posts : initialPosts
  const [postsReady, setPostsReady] = useState(list.length === 0)
  const [tab, setTab] = useState<'for-you' | 'people'>('for-you')
  const [people, setPeople] = useState(initialPeople)
  const [pendingSlug, setPendingSlug] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  const signedIn = account !== null

  useEffect(() => {
    hydrate(initialPosts)
  }, [initialPosts, hydrate])

  useEffect(() => {
    if (postsReady) return
    const timer = window.setTimeout(() => setPostsReady(true), 420)
    return () => window.clearTimeout(timer)
  }, [postsReady])

  function guard(action: () => void) {
    if (!signedIn) {
      setShowLogin(true)
      return
    }
    action()
  }

  async function onFollow(slug: string) {
    if (!signedIn) {
      setShowLogin(true)
      return
    }
    setPendingSlug(slug)
    try {
      const result = await toggleFollow(slug)
      setPeople((current) =>
        current.map((person) =>
          person.slug === slug
            ? { ...person, following: result.following, followersCount: result.followersCount, followers: compact(result.followersCount) }
            : person,
        ),
      )
    } catch {
      setShowLogin(true)
    } finally {
      setPendingSlug(null)
    }
  }

  return (
    <main className="aura-feed">
      <header className="aura-bar">
        <Link href="/" className="aura-logo">Aura<span>.</span></Link>
        <div className="aura-bar-meta"><span>People</span><span>Digital memory archive</span></div>
        <div className="aura-bar-actions">
          {account ? (
            <>
              <Link href="/create" className="create-link" aria-label="Create a post"><Plus size={18} /></Link>
              <Link href="/search" className="aura-search" aria-label="Search people"><Search size={16} /></Link>
              <AccountMenu name={account.name} image={account.image} />
            </>
          ) : (
            <Link href="/login" className="aura-login-link">Sign in</Link>
          )}
        </div>
      </header>

      {signedIn && (
        <nav className="feed-tabs" aria-label="Feed views">
          <button type="button" className={`feed-tab ${tab === 'for-you' ? 'is-selected' : ''}`} onClick={() => setTab('for-you')} aria-pressed={tab === 'for-you'}>For you</button>
          <button type="button" className={`feed-tab ${tab === 'people' ? 'is-selected' : ''}`} onClick={() => setTab('people')} aria-pressed={tab === 'people'}>People</button>
        </nav>
      )}

      {tab === 'people' && signedIn ? (
        <section className="people-feed people-feed-directory" aria-label="People">
          <PeopleDirectory people={people} pendingSlug={pendingSlug} onFollow={(slug) => void onFollow(slug)} />
        </section>
      ) : (
        <section className={`people-feed ${postsReady ? 'posts-ready' : 'posts-loading'}`} aria-label="Aura feed" aria-busy={!postsReady}>
          {!postsReady && <div className="feed-loading"><AuraLoader variant="inline" size="lg" text="Remembering" /></div>}
          {error && <p className="feed-error" role="alert">{error}</p>}
          {list.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              index={index}
              onStar={() => guard(() => void toggleStar(post.id))}
              onShare={() => guard(() => void share(post.id))}
            />
          ))}
          {hasMore && (
            <div className="feed-end">
              <button type="button" className="create-image-button" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? <AuraLoader variant="inline" size="sm" text="Loading" /> : 'Load older entries'}
              </button>
            </div>
          )}
        </section>
      )}

      <LoginPrompt open={showLogin} onClose={() => setShowLogin(false)} />
    </main>
  )
}
