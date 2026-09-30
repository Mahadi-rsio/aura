import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { getPerson, people, profileGallery, profileMemories } from '@/lib/people'

export function generateStaticParams() { return people.map((person) => ({ slug: person.slug })) }

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const person = getPerson(slug)
  if (!person) notFound()
  return (
    <main className="profile-page">
      <Link href="/" className="profile-back"><ArrowLeft size={15} /> All people</Link>
      <section className="profile-hero">
        <div className="profile-hero-image"><img src={person.image} alt={`${person.name} portrait`} /><span>{person.accent} / 05</span></div>
        <div className="profile-hero-copy"><p className="feed-kicker">{person.role} / {person.location}</p><h1>{person.name}</h1><p className="profile-statement">{person.statement}</p></div>
      </section>
      <section className="profile-intro"><span>Personal record / 001</span><p>This is a life in fragments — collected through places, people, and the moments that quietly change the shape of a day.</p></section>
      <section className="profile-memories"><div className="profile-section-head"><span>Memory archive</span><span>Selected fragments / 03</span></div><div className="profile-memory-list">{profileMemories.map((memory, index) => <article className="profile-memory" key={memory.title}><div className="profile-memory-image"><img src={memory.image} alt={memory.title} loading="lazy" /><span>0{index + 1}</span></div><div><p className="feed-kicker">{memory.date} · {memory.place}</p><h2>{memory.title}</h2><p>{memory.story}</p></div></article>)}</div></section>
      <section className="profile-gallery"><div className="profile-section-head"><span>Visual record</span><span>Unfinished / ongoing</span></div><div className="profile-gallery-grid">{profileGallery.map((image, index) => <img key={image} src={image} alt={`Memory ${index + 1}`} loading="lazy" />)}</div></section>
      <section className="profile-end"><p>“The most important things are often the ones we almost miss.”</p><div><Link href="mailto:hello@example.com">Write a note <ArrowUpRight size={15} /></Link><Link href="/">Discover another life <ArrowUpRight size={15} /></Link></div></section>
    </main>
  )
}
