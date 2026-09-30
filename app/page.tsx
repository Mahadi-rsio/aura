'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUpRight, Menu, X } from 'lucide-react'

const profile = {
  name: 'Alexandra\nNoir',
  eyebrow: 'A life in fragments / 001',
  statement: 'I collect the quiet things — light on a wall, a voice remembered, the distance between who we were and who we are becoming.',
  bio: 'Alexandra Noir is a multidisciplinary storyteller based between cities, seasons, and states of mind. Her work lives somewhere between observation and feeling — a practice of paying attention to what usually passes unnoticed.',
  secondaryBio: 'This is not an archive of achievements. It is a living record of the people, places, and passing moments that gave shape to a life.',
  quote: '“The most important things are often the ones we almost miss.”',
}

const moments = [
  { year: '1993', title: 'First light', text: 'Born in a small coastal town where the horizon was always visible.' },
  { year: '2011', title: 'The departure', text: 'Left home with one bag, a notebook, and a question.' },
  { year: '2016', title: 'A new language', text: 'Found a creative practice in the space between image and memory.' },
  { year: '2024', title: 'Still becoming', text: 'Learning to stay present. Making room for what comes next.' },
]

const memories = [
  { number: '01', date: '08.2014', place: 'North Atlantic', title: 'Where the world went quiet', story: 'A long walk at the edge of the map. The wind did most of the talking.', image: '/images/memory-coast.png', className: 'memory-feature' },
  { number: '02', date: '11.2018', place: 'East London', title: 'The room with good light', story: 'A borrowed studio, an unfinished idea, and the first time the work felt like mine.', image: '/images/memory-studio.png', className: 'memory-offset' },
  { number: '03', date: '03.2022', place: 'Tokyo, Japan', title: 'After the rain', story: 'A city in reflection. Everyone moving, briefly illuminated.', image: '/images/memory-city.png', className: 'memory-small' },
]

const gallery = [
  { image: '/images/portrait.png', alt: 'Portrait in soft window light', label: 'self / 001' },
  { image: '/images/memory-studio.png', alt: 'A quiet studio interior', label: 'place / 014' },
  { image: '/images/memory-coast.png', alt: 'A figure walking along the coast', label: 'distance / 021' },
  { image: '/images/memory-city.png', alt: 'Figure crossing a city at night', label: 'motion / 032' },
  { image: '/images/hero-cover.png', alt: 'Abstract portrait cover', label: 'cover / 041' },
  { image: '/images/memory-studio.png', alt: 'Light across the studio floor', label: 'light / 048' },
]

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeMemory, setActiveMemory] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible')
      })
    }, { threshold: 0.12 })
    document.querySelectorAll('.reveal').forEach((el) => reveal.observe(el))
    return () => reveal.disconnect()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveMemory((current) => (current + 1) % memories.length)
    }, 5200)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setImageLoaded(false)
  }, [activeMemory])

  return (
    <main className="site-shell">
      <header className="site-header">
        <a href="#top" className="wordmark" aria-label="Alexandra Noir home">AN<span>.</span></a>
        <div className="header-meta"><span>Digital biography</span><span>44° 03' N / 7° 41' E</span></div>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
      </header>

      <nav className={`mobile-nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
        {['Story', 'Archive', 'Timeline', 'Connect'].map((item) => <a href={`#${item.toLowerCase()}`} key={item} onClick={() => setMenuOpen(false)}>{item}</a>)}
      </nav>

      <section id="top" className="hero section-pad">
        <div className="hero-gridline" aria-hidden="true" />
        <div className="hero-label reveal"><span>01</span><span>Portrait / present tense</span></div>
        <div className="hero-copy reveal"><p className="eyebrow">{profile.eyebrow}</p><h1>{profile.name.split('\n').map((line) => <span key={line}>{line}</span>)}</h1><p className="hero-note">A study of a person, in progress.</p></div>
        <div className="hero-portrait reveal"><div className="hero-aura" aria-hidden="true" /><img src="/images/hero-cover.png" alt="Abstract portrait cover for Alexandra Noir" /><div className="image-index">01 / 04</div></div>
        <div className="hero-bottom"><span>Scroll to enter</span><ArrowDown size={16} strokeWidth={1} /><span className="hero-coordinate">x: 44.03 / y: 7.41</span></div>
      </section>

      <section className="statement section-pad reveal"><p className="section-kicker">02 — Personal statement</p><p className="statement-text">{profile.statement}</p></section>

      <section id="story" className="story section-pad">
        <div className="section-kicker reveal">03 — The story</div>
        <div className="story-layout"><div className="story-index reveal">[ A / N ]<br /><span>personal record</span></div><div className="story-copy reveal"><p className="story-lead">A biography is not a straight line. It is a constellation — a series of points that only become meaningful when seen from a distance.</p><p>{profile.bio}</p><p>{profile.secondaryBio}</p><a className="text-link" href="#timeline">Read through time <ArrowUpRight size={14} /></a></div></div>
      </section>

      <section id="archive" className="archive section-pad"><div className="section-heading reveal"><span className="section-kicker">05 — Memory archive</span><span className="heading-note">Selected fragments / 03</span></div><div className="memory-stage"><div className={`memory-visual reveal ${imageLoaded ? 'is-loaded' : ''}`}><div className="pixel-loader" aria-hidden="true"><span>Loading memory</span></div><img key={memories[activeMemory].image} src={memories[activeMemory].image} alt={memories[activeMemory].title} onLoad={() => setImageLoaded(true)} /><span className="memory-counter">{memories[activeMemory].number} / 03</span><span className="memory-progress" aria-hidden="true"><span style={{ width: `${((activeMemory + 1) / memories.length) * 100}%` }} /></span></div><div className="memory-details reveal"><p className="eyebrow">{memories[activeMemory].date} · {memories[activeMemory].place}</p><h2>{memories[activeMemory].title}</h2><p>{memories[activeMemory].story}</p><div className="memory-controls"><button onClick={() => setActiveMemory((activeMemory + memories.length - 1) % memories.length)} aria-label="Previous memory">←</button><button onClick={() => setActiveMemory((activeMemory + 1) % memories.length)} aria-label="Next memory">→</button></div></div></div><div className="memory-tabs">{memories.map((memory, index) => <button className={index === activeMemory ? 'active' : ''} key={memory.number} onClick={() => setActiveMemory(index)}><span>{memory.number}</span>{memory.place}</button>)}</div></section>

      <section id="timeline" className="timeline section-pad"><div className="section-kicker reveal">06 — A life in time</div><div className="timeline-intro reveal"><h2>Everything<br /><em>leaves a trace.</em></h2><p>Some years are loud. Others are only understood later. This is the shape they make together.</p></div><div className="timeline-line">{moments.map((moment, index) => <div className={`timeline-node reveal ${index % 2 ? 'node-right' : ''}`} key={moment.year}><span className="node-year">{moment.year}</span><div className="node-dot" /><div className="node-copy"><h3>{moment.title}</h3><p>{moment.text}</p></div></div>)}</div></section>

      <section className="gallery section-pad"><div className="section-heading reveal"><span className="section-kicker">06 — Memory reel</span><span className="heading-note">A continuous visual record</span></div><div className="memory-reel" aria-label="Continuous memory gallery"><div className="memory-reel-track">{[...gallery, ...gallery].map((item, index) => <figure className="reel-item reveal" key={`${item.label}-${index}`}><img src={item.image} alt={item.alt} loading="lazy" /><figcaption><span>{item.label}</span><span>0{(index % gallery.length) + 1}</span></figcaption></figure>)}</div></div></section>

      <section className="quote-section section-pad reveal"><span className="quote-mark">“</span><blockquote>{profile.quote}</blockquote><div className="quote-rule" /><p>— a note to remember</p></section>

      <section id="connect" className="connect section-pad"><div className="section-kicker reveal">08 — Stay in touch</div><div className="connect-layout"><h2 className="reveal">Let&apos;s keep<br /><em>the thread.</em></h2><div className="social-links reveal"><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={15} /></a><a href="https://are.na" target="_blank" rel="noreferrer">Are.na <ArrowUpRight size={15} /></a><a href="mailto:hello@example.com">Email <ArrowUpRight size={15} /></a></div></div></section>

      <footer className="footer section-pad"><span>© {new Date().getFullYear()} / Alexandra Noir</span><span>Made slowly, kept carefully.</span><a href="/dashboard">Archive dashboard ↗</a><a href="#top">Back to top ↑</a></footer>
    </main>
  )
}
