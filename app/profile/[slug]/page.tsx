import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import {
  getAuthoredPosts,
  getGalleryImages,
  getMemoryPosts,
  getPersonBySlug,
  getProfileStats,
} from '@/lib/api'
import { getSessionId } from '@/lib/session'
import { toPerson } from '@/lib/mappers'
import { getPerson as getMockPerson } from '@/lib/people'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sessionId = await getSessionId()
  const row = await getPersonBySlug(slug)

  if (!row) {
    const mock = getMockPerson(slug)
    if (!mock) notFound()
    return <MockProfile person={mock} />
  }

  const person = toPerson(row)
  const [posts, memories, gallery, stats] = await Promise.all([
    getAuthoredPosts(row.id, 24),
    getMemoryPosts(row.id),
    getGalleryImages(row.id),
    getProfileStats(row.id),
  ])

  return (
    <main className="profile-page">
      <Link href="/" className="profile-back"><ArrowLeft size={15} /> All people</Link>
      <section className="profile-hero">
        <div className="profile-hero-image"><img src={person.image} alt={`${person.name} portrait`} /><span>{person.accent} / 05</span></div>
        <div className="profile-hero-copy"><p className="feed-kicker">{person.role} / {person.location}</p><h1>{person.name}</h1><p className="profile-statement">{person.statement}</p></div>
      </section>
      <section className="profile-stats">
        <div className="profile-stat"><span>Entries</span><strong>{stats.posts.toString().padStart(2, '0')}</strong></div>
        <div className="profile-stat"><span>Stars</span><strong>{stats.stars.toLocaleString('en-GB')}</strong></div>
        <div className="profile-stat"><span>Images</span><strong>{stats.media.toString().padStart(2, '0')}</strong></div>
      </section>
      <nav className="profile-tabs" aria-label="Profile sections">
        <a href="#profile-posts" className="profile-tab is-active">Posts <span>{String(posts.length).padStart(2, '0')}</span></a>
        <a href="#profile-memories" className="profile-tab">Memories <span>{String(memories.length).padStart(2, '0')}</span></a>
        <a href="#profile-gallery" className="profile-tab">Gallery <span>{String(gallery.length).padStart(2, '0')}</span></a>
      </nav>
      <section className="profile-intro"><span>Personal record / 001</span><p>This is a life in fragments — collected through places, people, and the moments that quietly change the shape of a day.</p></section>
      {posts.length > 0 && (
        <section className="profile-posts" id="profile-posts">
          <div className="profile-section-head"><span>Everything published</span><span>{String(posts.length).padStart(2, '0')} entries</span></div>
          <div className="profile-post-grid">
            {posts.map((post) => (
              <Link href={`/post/${post.slug}`} className={`profile-post-card profile-post-card-${post.type}`} key={post.id}>
                {post.image ? <img src={post.image} alt="" loading="lazy" /> : <span className="profile-post-card-blank" aria-hidden="true">∿</span>}
                <div className="profile-post-card-copy">
                  <span className="post-type">{post.type}</span>
                  <h2>{post.title}</h2>
                  <p>{post.body.split('\n')[0]}</p>
                  <small>{post.date} · ★ {post.stars}</small>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {memories.length > 0 && (
        <section className="profile-memories" id="profile-memories">
          <div className="profile-section-head"><span>Memory archive</span><span>Selected fragments / {String(memories.length).padStart(2, '0')}</span></div>
          <div className="profile-memory-list">
            {memories.map((memory, index) => (
              <article className="profile-memory" key={memory.id}>
                <div className="profile-memory-image"><img src={memory.image} alt={memory.title} loading="lazy" /><span>0{index + 1}</span></div>
                <div><p className="feed-kicker">{memory.date} · {memory.place}</p><h2>{memory.title}</h2><p>{memory.story}</p></div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="profile-gallery" id="profile-gallery">
        <div className="profile-section-head"><span>Visual record</span><span>Unfinished / ongoing</span></div>
        <div className="profile-gallery-grid">{gallery.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Memory ${index + 1}`} loading="lazy" />)}</div>
      </section>
      <section className="profile-end"><p>“The most important things are often the ones we almost miss.”</p><div><Link href="/create">Add to this story <ArrowUpRight size={15} /></Link><Link href="/">Discover another life <ArrowUpRight size={15} /></Link></div></section>
    </main>
  )
}

function MockProfile({ person }: { person: NonNullable<ReturnType<typeof getMockPerson>> }) {
  return (
    <main className="profile-page">
      <Link href="/" className="profile-back"><ArrowLeft size={15} /> All people</Link>
      <section className="profile-hero">
        <div className="profile-hero-image"><img src={person.image} alt={`${person.name} portrait`} /><span>{person.accent} / 05</span></div>
        <div className="profile-hero-copy"><p className="feed-kicker">{person.role} / {person.location}</p><h1>{person.name}</h1><p className="profile-statement">{person.statement}</p></div>
      </section>
      <section className="profile-end"><p>No database is configured, so only the seeded people have full profiles.</p><div><Link href="/">Discover another life <ArrowUpRight size={15} /></Link></div></section>
    </main>
  )
}