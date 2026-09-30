'use client'

import Link from 'next/link'
import { ArrowUpRight, Mail } from 'lucide-react'

export default function PersonalProfilePage() {
  return (
    <main className="personal-profile-page">
      <Link href="/" className="personal-profile-back">Back to Aura</Link>
      <section className="personal-profile-hero">
        <div className="personal-profile-image"><img src="/images/portrait.png" alt="Your profile portrait" /></div>
        <div className="personal-profile-copy">
          <p className="profile-eyebrow">Your archive / 2026</p>
          <h1>Your<br /><em>story.</em></h1>
          <p className="personal-profile-bio">A private room for the moments, people, images, and words that make up your becoming.</p>
          <Link href="/create" className="personal-profile-action">Create a post <ArrowUpRight size={15} /></Link>
        </div>
      </section>
      <section className="personal-profile-intro">
        <span>About this space</span>
        <p>Keep the things that usually disappear. A feeling from this morning. A room you still remember. A sentence worth returning to.</p>
      </section>
      <section className="personal-profile-grid">
        <div><span>Archive</span><strong>24</strong><small>pieces collected</small></div>
        <div><span>Following</span><strong>128</strong><small>lives in orbit</small></div>
        <div><span>Stars</span><strong>3.2k</strong><small>quiet appreciations</small></div>
      </section>
      <section className="personal-profile-links">
        <p>Find me elsewhere</p>
        <a href="https://instagram.com" target="_blank" rel="noreferrer"><span className="profile-link-mark">@</span> Instagram <ArrowUpRight size={14} /></a>
        <a href="mailto:hello@example.com"><Mail size={16} /> hello@example.com <ArrowUpRight size={14} /></a>
      </section>
    </main>
  )
}
