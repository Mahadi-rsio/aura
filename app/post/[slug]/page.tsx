import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getPostBySlug, NotFoundError } from '@/lib/api'
import { getSessionId } from '@/lib/session'
import PostActions from '@/components/post/post-actions'

export const dynamic = 'force-dynamic'

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sessionId = await getSessionId()

  let post
  try {
    post = await getPostBySlug(slug, sessionId)
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }

  const images = post.images ?? (post.image ? [post.image] : [])

  return (
    <main className="post-detail-page">
      <Link href="/" className="profile-back"><ArrowLeft size={15} /> Back to the archive</Link>
      <article className={`post-detail post-detail-${post.type}`}>
        <div className="post-detail-top">
          <span className="post-type">{post.type}</span>
          <span>{post.date}</span>
        </div>
        {post.eyebrow && <p className="feed-kicker">{post.eyebrow}</p>}
        <h1>{post.title}</h1>
        {post.type === 'poem' || post.type === 'quote' || post.type === 'note' ? (
          <p className="post-detail-body post-detail-body-literary">{post.body}</p>
        ) : (
          <p className="post-detail-body">{post.body}</p>
        )}
        {post.moodScore !== null && post.moodScore !== undefined && (
          <p className="post-detail-mood">Intensity <span>{post.moodScore}</span> / 10</p>
        )}
        {post.type === 'album' && images.length > 0 && (
          <div className="post-detail-carousel">
            {images.map((image, index) => (
              <figure key={`${image}-${index}`}>
                <img src={image} alt={`${post.title}, frame ${index + 1}`} loading={index ? 'lazy' : 'eager'} />
                <figcaption>{String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</figcaption>
              </figure>
            ))}
          </div>
        )}
        {post.type !== 'album' && images.length > 0 && (
          <div className="post-detail-lead">
            <img src={images[0]} alt={`${post.author} — ${post.title}`} />
          </div>
        )}
        {post.tags.length > 0 && <div className="person-tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
        <Link href={`/profile/${post.authorSlug}`} className="post-author post-detail-author">
          {post.image && <img src={post.image} alt="" />} <span>{post.author}</span>
        </Link>
        <PostActions id={post.id} stars={post.starsCount} shares={post.sharesCount} views={post.views} />
      </article>
    </main>
  )
}