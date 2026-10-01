import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Pencil } from 'lucide-react'
import {
  getAuthoredPosts,
  getAuthoredPostsByType,
  getCollections,
  getGalleryImages,
  getMemoryPosts,
  getPersonBySlug,
  getProfilePeriods,
  getProfilePlaces,
  getProfileStats,
  getProfileTags,
  getTopStarredPosts,
} from '@/lib/api'
import { getSessionId } from '@/lib/session'
import { compactCount, formatMonthYear, normalizeProfileLinks, toPerson } from '@/lib/mappers'
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
  const isOwner = sessionId === row.id
  const bio = row.bio.trim()
  const showBio = bio.length > 0 && bio !== row.statement.trim()
  const links = normalizeProfileLinks(row.links)

  const [posts, milestones, moods, literary, memories, gallery, places, tags, periods, starred, stats, collections] = await Promise.all([
    getAuthoredPosts(row.id, 24),
    getAuthoredPostsByType(row.id, ['achievement'], 6),
    getAuthoredPostsByType(row.id, ['mood', 'feeling'], 10),
    getAuthoredPostsByType(row.id, ['quote', 'poem', 'note'], 6),
    getMemoryPosts(row.id),
    getGalleryImages(row.id),
    getProfilePlaces(row.id),
    getProfileTags(row.id),
    getProfilePeriods(row.id),
    getTopStarredPosts(row.id, 3),
    getProfileStats(row.id),
    getCollections(row.id),
  ])

  const typeRows = stats.byType.filter((entry) => entry.count > 0)
  const periodMax = Math.max(1, ...periods.map((entry) => entry.count))

  const tabs = [
    { href: '#profile-posts', label: 'Posts', count: posts.length },
    { href: '#profile-milestones', label: 'Milestones', count: milestones.length },
    { href: '#profile-moods', label: 'Weather', count: moods.length },
    { href: '#profile-literary', label: 'Words', count: literary.length },
    { href: '#profile-memories', label: 'Memories', count: memories.length },
    { href: '#profile-places', label: 'Places', count: places.length },
    { href: '#profile-gallery', label: 'Gallery', count: gallery.length },
  ].filter((tab, index) => tab.count > 0 || index === 0)

  return (
    <main className="profile-page">
      <Link href="/" className="profile-back"><ArrowLeft size={15} /> All people</Link>

      <section className="profile-hero">
        <div className="profile-hero-image"><img src={person.image} alt={`${person.name} portrait`} /><span>{person.accent} / 05</span></div>
        <div className="profile-hero-copy">
          <p className="feed-kicker">{person.role} / {person.location}</p>
          <h1>{person.name}</h1>
          <p className="profile-statement">{person.statement}</p>
          {isOwner && (
            <div className="profile-hero-actions">
              <Link href="/profile/edit" className="profile-edit-link"><Pencil size={14} /> Edit profile</Link>
              <Link href="/profile" className="profile-edit-link">Your story <ArrowUpRight size={14} /></Link>
            </div>
          )}
        </div>
      </section>

      <section className="profile-stats">
        <div className="profile-stat"><span>Entries</span><strong>{stats.posts.toString().padStart(2, '0')}</strong></div>
        <div className="profile-stat"><span>Stars</span><strong>{stats.stars.toLocaleString('en-GB')}</strong></div>
        <div className="profile-stat"><span>Images</span><strong>{stats.media.toString().padStart(2, '0')}</strong></div>
        <div className="profile-stat"><span>Words</span><strong>{compactCount(stats.words)}</strong></div>
        <div className="profile-stat"><span>Read</span><strong>{compactCount(stats.views)}</strong></div>
        <div className="profile-stat"><span>Shared</span><strong>{compactCount(stats.shares)}</strong></div>
        {stats.since && <p className="profile-since">In the archive since {formatMonthYear(stats.since)}</p>}
      </section>

      <nav className="profile-tabs" aria-label="Profile sections">
        {tabs.map((tab, index) => (
          <a key={tab.href} href={tab.href} className={`profile-tab ${index === 0 ? 'is-active' : ''}`}>
            {tab.label} <span>{String(tab.count).padStart(2, '0')}</span>
          </a>
        ))}
      </nav>

      {showBio && (
        <section className="profile-in-words" id="profile-in-words">
          <span>In their own words / 001</span>
          <p>{bio}</p>
        </section>
      )}

      {links.length > 0 && (
        <section className="profile-elsewhere" id="profile-elsewhere">
          <div className="profile-section-head"><span>Elsewhere</span><span>{String(links.length).padStart(2, '0')} links</span></div>
          <div className="profile-elsewhere-list">
            {links.map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer noopener">
                {link.label} <ArrowUpRight size={14} />
              </a>
            ))}
          </div>
        </section>
      )}

      {typeRows.length > 0 && (
        <section className="profile-ledger" id="profile-ledger">
          <div className="profile-section-head"><span>The ledger</span><span>Entries by kind</span></div>
          <div className="profile-ledger-list">
            {typeRows.map((entry) => {
              const total = Math.max(1, ...typeRows.map((item) => item.count))
              return (
                <div className="profile-ledger-row" key={entry.type}>
                  <span>{entry.type}</span>
                  <i className="profile-ledger-track"><i style={{ width: `${Math.round((entry.count / total) * 100)}%` }} /></i>
                  <small>{String(entry.count).padStart(2, '0')}</small>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section className="profile-posts" id="profile-posts">
          <div className="profile-section-head"><span>Everything published</span><span>{String(posts.length).padStart(2, '0')} entries</span></div>
          <div className="profile-post-grid">
            {posts.map((post) => <ProfilePostCard post={post} key={post.id} />)}
          </div>
        </section>
      )}

      {milestones.length > 0 && (
        <section className="profile-milestones" id="profile-milestones">
          <div className="profile-section-head"><span>Milestones</span><span>Finished, kept / {String(milestones.length).padStart(2, '0')}</span></div>
          <div className="profile-milestone-list">
            {milestones.map((post, index) => (
              <article className="profile-milestone" key={post.id}>
                <Link href={`/post/${post.slug}`} className="profile-milestone-image">
                  {post.image ? <img src={post.image} alt="" loading="lazy" /> : <span className="profile-post-card-blank" aria-hidden="true">∿</span>}
                </Link>
                <div>
                  <p className="profile-milestone-index">{String(index + 1).padStart(2, '0')} / {post.date}</p>
                  <h2><Link href={`/post/${post.slug}`}>{post.title}</Link></h2>
                  <p>{post.body.split('\n')[0]}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {moods.length > 0 && (
        <section className="profile-moods" id="profile-moods">
          <div className="profile-section-head"><span>Inner weather</span><span>Intensity / 10</span></div>
          <div className="profile-mood-list">
            {moods.map((post) => (
              <Link href={`/post/${post.slug}`} className="profile-mood" key={post.id}>
                <div>
                  <h3>{post.title}</h3>
                  <span>{post.type} · {post.date}{post.place ? ` · ${post.place}` : ''}</span>
                </div>
                <i className="profile-mood-track"><i style={{ width: `${(post.moodScore ?? 0) * 10}%` }} /></i>
                <strong>{post.moodScore ?? '—'}</strong>
              </Link>
            ))}
          </div>
        </section>
      )}

      {literary.length > 0 && (
        <section className="profile-literary" id="profile-literary">
          <div className="profile-section-head"><span>Words kept</span><span>Quotes, poems, notes / {String(literary.length).padStart(2, '0')}</span></div>
          <div className="profile-literary-list">
            {literary.map((post) => (
              <Link href={`/post/${post.slug}`} className={`profile-literary-card literary-card-${post.type}`} key={post.id}>
                <span>{post.type} / {post.date}</span>
                <h2>{post.title}</h2>
                <p>{post.body.split('\n').slice(0, 4).join('\n')}</p>
                <small>★ {post.stars}</small>
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
        <div className="profile-section-head"><span>Visual record</span><span>{gallery.length ? 'Unfinished / ongoing' : 'Nothing framed yet'}</span></div>
        {gallery.length > 0 ? (
          <div className="profile-gallery-grid">{gallery.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Frame ${index + 1}`} loading="lazy" />)}</div>
        ) : (
          <p className="profile-collection-empty">No images have been attached to this archive yet.</p>
        )}
      </section>

      {places.length > 0 && (
        <section className="profile-places" id="profile-places">
          <div className="profile-section-head"><span>Where it happened</span><span>{String(places.length).padStart(2, '0')} places</span></div>
          <div className="profile-place-list">
            {places.map((place) => (
              <span className="profile-place" key={place.place}>
                {place.place} <small>{String(place.count).padStart(2, '0')}</small>
              </span>
            ))}
          </div>
        </section>
      )}

      {periods.length > 1 && (
        <section className="profile-periods" id="profile-periods">
          <div className="profile-section-head"><span>By year</span><span>Entries per year</span></div>
          <div className="profile-period-track">
            {periods.map((period) => (
              <div className="profile-period" key={period.period}>
                <i style={{ height: `${Math.max(6, Math.round((period.count / periodMax) * 100))}%` }} />
                <span>{period.period}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {starred.some((post) => post.starsCount > 0) && (
        <section className="profile-resonance" id="profile-resonance">
          <div className="profile-section-head"><span>Most resonant</span><span>Quietly starred</span></div>
          <div className="profile-resonance-list">
            {starred.filter((post) => post.starsCount > 0).map((post, index) => (
              <Link href={`/post/${post.slug}`} key={post.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><h2>{post.title}</h2><p>{post.body.split('\n')[0]}</p></div>
                <small>{post.type} · ★ {post.stars}</small>
                <ArrowUpRight size={15} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {(tags.length > 0 || person.tags.length > 0) && (
        <section className="profile-tags" id="profile-tags">
          <div className="profile-section-head"><span>Threads</span><span>What keeps recurring</span></div>
          <div className="profile-tag-cloud">
            {person.tags.map((tag) => <span className="profile-tag profile-tag-own" key={`own-${tag}`}>{tag}</span>)}
            {tags.map((entry) => <span className="profile-tag" key={entry.tag}>{entry.tag} <small>{entry.count}</small></span>)}
          </div>
        </section>
      )}

      {collections.length > 0 && (
        <section className="profile-rooms" id="profile-rooms">
          <div className="profile-section-head"><span>Keep close</span><span>Curated rooms</span></div>
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
        </section>
      )}

      <section className="profile-end">
        <p>“The most important things are often the ones we almost miss.”</p>
        <div>
          {isOwner ? <Link href="/profile/edit">Revise this record <ArrowUpRight size={15} /></Link> : <Link href="/create">Add to this story <ArrowUpRight size={15} /></Link>}
          <Link href="/">Discover another life <ArrowUpRight size={15} /></Link>
        </div>
      </section>
    </main>
  )
}

function ProfilePostCard({ post }: { post: Awaited<ReturnType<typeof getAuthoredPosts>>[number] }) {
  return (
    <Link href={`/post/${post.slug}`} className={`profile-post-card profile-post-card-${post.type}`}>
      {post.image ? <img src={post.image} alt="" loading="lazy" /> : <span className="profile-post-card-blank" aria-hidden="true">∿</span>}
      <div className="profile-post-card-copy">
        <span className="post-type">{post.type}</span>
        <h2>{post.title}</h2>
        <p>{post.body.split('\n')[0]}</p>
        <small>{post.date} · ★ {post.stars}</small>
      </div>
    </Link>
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
