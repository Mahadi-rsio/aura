'use client'

import { useState } from 'react'
import { Eye, Share2, Star } from 'lucide-react'
import * as client from '@/lib/client-api'
import { compactCount } from '@/lib/mappers'

export default function PostActions({ id, stars, shares, views }: { id: string; stars: number; shares: number; views: string }) {
  const [starred, setStarred] = useState(false)
  const [starCount, setStarCount] = useState(stars)
  const [shareCount, setShareCount] = useState(shares)
  const [error, setError] = useState<string | null>(null)

  async function onStar() {
    const before = { starred, starCount }
    const next = { starred: !starred, starCount: starCount + (starred ? -1 : 1) }
    setStarred(next.starred)
    setStarCount(next.starCount)
    setError(null)
    try {
      const result = await client.toggleStar(id)
      setStarred(result.starred)
      setStarCount(result.stars)
    } catch (caught) {
      setStarred(before.starred)
      setStarCount(before.starCount)
      setError(caught instanceof client.ApiError ? caught.message : 'Could not star that entry')
    }
  }

  async function onShare() {
    const before = shareCount
    setShareCount(before + 1)
    setError(null)
    try {
      const result = await client.incrementShare(id)
      setShareCount(result.shares)
    } catch (caught) {
      setShareCount(before)
      setError(caught instanceof client.ApiError ? caught.message : 'Could not share that entry')
    }
  }

  return (
    <div className="post-detail-actions">
      <span className="person-view-count person-view-count-action"><Eye size={14} aria-hidden="true" /><span className="sr-only">{views} views</span><span>{views}</span></span>
      <button className={`star-button ${starred ? 'is-selected' : ''}`} type="button" onClick={() => void onStar()} aria-pressed={starred}>
        <Star size={15} fill="currentColor" /> <span>Star</span><strong>{compactCount(starCount)}</strong>
      </button>
      <button className="person-share-count" type="button" onClick={() => void onShare()}>
        <Share2 size={14} aria-hidden="true" /><span className="sr-only">{compactCount(shareCount)} shares</span><span>{compactCount(shareCount)}</span>
      </button>
      {error && <span className="create-error" role="alert">{error}</span>}
    </div>
  )
}