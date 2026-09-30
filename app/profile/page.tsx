import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { compactCount } from '@/lib/mappers'
import { getAuthoredPosts, getCollections, getProfileStats } from '@/lib/api'
import { getSessionUser } from '@/lib/session'
import { toPerson } from '@/lib/mappers'

export const dynamic = 'force-dynamic'

export default async function PersonalProfilePage() {
  const user = await getSessionUser()

  if (!user) {
    return (
      <main className="personal-profile-page">
        <Link href="/" className="personal-profile-back">Back to Aura</Link>
        <section className="personal-profile-hero">
          <div className="personal-profile-image"><img src="/images/portrait.png" alt="Your profile portrait" /></div>
          <div className="personal-profile-copy">
            <p className="profile-eyebrow">Your archive / 2026</p>
            <h1>Your<br /><em>story.</em></h1>
            <p className="personal-profile-bio">A private room for the moments, people, images, and words that make up your becoming.</p>
            <Link href="/login?next=/profile" className="personal-profile-action">Sign in to continue <ArrowUpRight size={15} /></Link>
          </div>
        </section>
        <section className="personal-profile-intro">
          <span>About this space</span>
          <p>Sign in with email and password to claim a profile, publish entries, and keep the pieces that usually disappear.</p>
        </section>
      </main>
    )
  }

  const person = toPerson(user)
  const [stats, posts, collections] = await Promise.all([
    getProfileStats(user.id),
    getAuthoredPosts(user.id, 8, 'own'),
    getCollections(user.id),
  ])

  return (
    <main className="personal-profile-page">
      <Link href="/" className="personal-profile-back">Back to Aura</Link>
      <section className="personal-profile-hero">
        <div className="personal-profile-image"><img src={person.image} alt="Your profile portrait" /></div>
        <div className="personal-profile-copy">
          <p className="profile-eyebrow">Your archive / 2026</p>
          <h1>Your<br /><em>story.</em></h1>
          <p className="personal-profile-bio">{user.bio || user.statement}</p>
          <Link href={`/profile/${person.slug}`} className="personal-profile-action">View public profile <ArrowUpRight size={15} /></Link>
        </div>
      </section>
      <section className="personal-profile-intro">
        <span>About this space</span>
        <p>Keep the things that usually disappear. A feeling from this morning. A room you still remember. A sentence worth returning to.</p>
      </section>
      <section className="personal-profile-grid">
        <div><span>Archive</span><strong>{stats.posts.toString().padStart(2, '0')}</strong><small>pieces collected</small></div>
        <div><span>Stars</span><strong>{compactCount(stats.stars)}</strong><small>quiet appreciations</small></div>
        <div><span>Images</span><strong>{stats.media.toString().padStart(2, '0')}</strong><small>frames attached</small></div>
      </section>
      {posts.length > 0 && (
        <section className="personal-profile-recent">
          <div className="profile-section-heading"><span>Most recent</span><small>Your last {Math.min(posts.length, 8)} entries</small></div>
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
      <section className="personal-profile-collections">
        <div className="profile-section-heading"><span>Keep close</span><small>Curated rooms from your archive</small></div>
        {collections.length ? (
          <div className="profile-collection-list">
            {collections.map((collection, index) => (
              <Link href={`/profile/${person.slug}`} key={collection.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{collection.name}</strong>
                <small>{String(collection.postCount).padStart(2, '0')} pieces</small>
                <ArrowUpRight size={14} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="profile-collection-empty">No rooms yet. Collections arrive with the next release of the archive.</p>
        )}
      </section>
      <section className="personal-profile-note">
        <span>Now</span>
        <p>Building a softer archive for the days that move too quickly.</p>
        <Link href="/create" className="profile-note-link">Add to your story <ArrowUpRight size={14} /></Link>
      </section>
    </main>
  )
}