'use client'

import Link from 'next/link'
import type { PersonDirectoryView } from '@/lib/mappers'

export default function PeopleDirectory({
  people,
  pendingSlug,
  onFollow,
}: {
  people: PersonDirectoryView[]
  pendingSlug: string | null
  onFollow: (slug: string) => void
}) {
  if (!people.length) {
    return <p className="people-empty">No people in the archive yet.</p>
  }

  return (
    <div className="people-directory">
      <div className="people-directory-head">
        <span>Archive · People</span>
        <span>{people.length.toString().padStart(2, '0')}</span>
      </div>
      <div className="people-list">
        {people.map((person, index) => (
          <div className="people-row" key={person.id}>
            <span className="people-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <Link href={`/profile/${person.slug}`} className="people-avatar">
              {person.image ? <img src={person.image} alt={person.name} loading="lazy" /> : <span className="people-avatar-placeholder" aria-hidden="true" />}
            </Link>
            <div className="people-identity">
              <Link href={`/profile/${person.slug}`} className="people-name">{person.name}</Link>
              <p className="people-role">{person.role}{person.location ? ` · ${person.location}` : ''}</p>
            </div>
            <p className="people-followers"><strong>{person.followers}</strong> {person.followersCount === 1 ? 'follower' : 'followers'}</p>
            {person.isSelf ? (
              <span className="people-self">You</span>
            ) : (
              <button
                type="button"
                className={`follow-button ${person.following ? 'is-selected' : ''}`}
                onClick={() => onFollow(person.slug)}
                disabled={pendingSlug === person.slug}
                aria-pressed={person.following}
              >
                {pendingSlug === person.slug ? '…' : person.following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
