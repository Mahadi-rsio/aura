// Source of truth for the seed and the no-database fallback. Every reader in
// `lib/api.ts` falls back to these arrays when DATABASE_URL is unset, which is
// what keeps `next build` working without a configured database.

export type Person = {
  id?: string
  slug: string
  name: string
  role: string
  location: string
  statement: string
  bio?: string
  links?: { label: string; url: string }[]
  image: string
  accent: string
  tags: string[]
  views: string
  stars: string
  shares: string
  viewsCount?: number
  starsCount?: number
  sharesCount?: number
}

export type FeedPost = {
  id: string
  slug?: string
  type: 'feeling' | 'memory' | 'achievement' | 'mood' | 'album' | 'quote' | 'poem' | 'note'
  images?: string[]
  author: string
  authorSlug: string
  image: string
  eyebrow: string
  title: string
  body: string
  date: string
  views: string
  stars: string
  shares: string
  viewsCount?: number
  starsCount?: number
  sharesCount?: number
}

export const people: Person[] = [
  { slug: 'alexandra-noir', name: 'Alexandra Noir', role: 'Story collector', location: 'North Atlantic', statement: 'I collect the quiet things — light on a wall, a voice remembered, the distance between who we were and who we are becoming.', bio: 'I have kept this archive since I was nineteen, though it took me most of those years to understand that I was not collecting things so much as learning how to stay. A photograph, a line from a letter, the exact blue of a kitchen at four in the afternoon — each one is a small argument that a moment was real.\n\nMost of what I write is written badly on purpose. The first draft is only there to find out what I actually think. What remains is quieter than what I set out to say, which I have come to trust.\n\nI live between two cities and keep no room in either that could be called mine.', links: [{"label": "newsletter", "url": "https://example.org/alexandra"}, {"label": "darkroom club", "url": "https://example.org/club"}], image: '/images/hero-cover.png', accent: '01', tags: ['memory', 'image', 'writing'], views: '4.8k', stars: '3k', shares: '898', viewsCount: 4800, starsCount: 3000, sharesCount: 898 },
  { slug: 'mira-sato', name: 'Mira Sato', role: 'Architect of stillness', location: 'Tokyo / 35° N', statement: 'The spaces we return to become part of our inner weather.', bio: 'I spend most of my days arranging the space between things — a doorway, a corridor of afternoon light, the gap a person leaves when they sit down beside you.\n\nArchitecture taught me that rooms are not containers but instructions. You can build a space that tells a body to hurry, or one that permits it to stop. I am interested in the second kind, and in the people who quietly remove themselves so it can happen.\n\nEverything here was written standing up, between one appointment and the next.', links: [{"label": "studio notes", "url": "https://example.org/mira"}, {"label": "roster", "url": "https://example.org/work"}], image: '/images/memory-city.png', accent: '02', tags: ['space', 'ritual', 'light'], views: '12k', stars: '4m', shares: '3.2k', viewsCount: 12000, starsCount: 4000000, sharesCount: 3200 },
  { slug: 'elias-vale', name: 'Elias Vale', role: 'Field recorder', location: 'Lisbon / 38° N', statement: 'Every city has a frequency. I spend my days learning how to hear it.', bio: 'I record places because they are alive and nobody has told them so.\n\nEvery city has a frequency that sits underneath its noise — the way a freight train enters a tunnel two streets away, the pitch of a market at closing, how a tiled hall sounds when it rains. Most of it is gone within a decade. That is not a tragedy; it is only a deadline.\n\nI work with a microphone and too many batteries, and I keep every recording in the order I made it. Some of them I will never be able to explain. I have stopped apologising for that.', links: [{"label": "field archive", "url": "https://example.org/elias"}, {"label": "press kit", "url": "https://example.org/press"}, {"label": "email", "url": "mailto:elias@example.org"}], image: '/images/memory-coast.png', accent: '03', tags: ['sound', 'travel', 'archive'], views: '898', stars: '2.4k', shares: '421', viewsCount: 898, starsCount: 2400, sharesCount: 421 },
  { slug: 'noor-khan', name: 'Noor Khan', role: 'Image maker', location: 'East London', statement: 'A photograph is a small room where time agrees to stay.', bio: 'I make photographs in a room with one window, and I have made almost all of them there.\n\nLight is the only collaborator I trust completely. It arrives on its own schedule, it cannot be persuaded to flatter anyone, and it tells you the truth about a face faster than a conversation would. I have never found a better way to ask someone to drop a performance.\n\nEverything is shot on film, developed by hand, and scanned slowly enough that I still have time to change my mind.', links: [{"label": "prints", "url": "https://example.org/noor"}, {"label": "process notes", "url": "https://example.org/process"}], image: '/images/memory-studio.png', accent: '04', tags: ['portrait', 'film', 'process'], views: '6.2k', stars: '18k', shares: '1.1k', viewsCount: 6200, starsCount: 18000, sharesCount: 1100 },
  { slug: 'theo-march', name: 'Theo March', role: 'Keeper of afterthoughts', location: 'Milan / 45° N', statement: 'I am interested in the pause after the moment, when meaning starts to arrive.', bio: 'I am interested in the pause after the moment, when meaning starts to arrive — usually in a taxi, usually too late to write down cleanly.\n\nI used to think a note was a conclusion. Now I think it is an instrument: a way of keeping a thought at exactly the right temperature long enough to see what it actually says. Most of mine never get finished. I have stopped minding.\n\nA fashion archive taught me that everything worth keeping gets described badly by the people who own it.', links: [{"label": "column", "url": "https://example.org/theo"}, {"label": "instagram", "url": "https://example.org/insta"}], image: '/images/portrait.png', accent: '05', tags: ['notes', 'fashion', 'presence'], views: '3.1k', stars: '7.8k', shares: '898', viewsCount: 3100, starsCount: 7800, sharesCount: 898 },
]

export const feedPosts: FeedPost[] = [
  { id: 'feeling-01', slug: 'a-little-more-open-today', type: 'feeling', author: 'Alexandra Noir', authorSlug: 'alexandra-noir', image: '/images/hero-cover.png', eyebrow: 'Feeling / 06:42', title: 'A little more open today.', body: 'Some mornings arrive without asking for anything. I am learning to let them.', date: 'Today', views: '4.8k', stars: '3k', shares: '898', viewsCount: 4800, starsCount: 3000, sharesCount: 898 },
  { id: 'memory-01', slug: 'after-the-rain', type: 'memory', author: 'Mira Sato', authorSlug: 'mira-sato', image: '/images/memory-city.png', eyebrow: 'Memory / Tokyo', title: 'After the rain', body: 'The city kept its reflections long after everyone had gone home.', date: '03.2022', views: '12k', stars: '4m', shares: '3.2k', viewsCount: 12000, starsCount: 4000000, sharesCount: 3200 },
  { id: 'achievement-01', slug: 'a-quiet-milestone', type: 'achievement', author: 'Noor Khan', authorSlug: 'noor-khan', image: '/images/memory-studio.png', eyebrow: 'Achievement / 04.2026', title: 'A quiet milestone.', body: 'The first edition of my image archive is now in the hands of 200 people.', date: '04.2026', views: '6.2k', stars: '18k', shares: '1.1k', viewsCount: 6200, starsCount: 18000, sharesCount: 1100 },
  { id: 'mood-01', slug: 'blue-hour-extended', type: 'mood', author: 'Elias Vale', authorSlug: 'elias-vale', image: '/images/memory-coast.png', eyebrow: 'Mood / North Atlantic', title: 'Blue hour, extended.', body: 'No destination today. Just the long way around.', date: '08.2014', views: '898', stars: '2.4k', shares: '421', viewsCount: 898, starsCount: 2400, sharesCount: 421 },
  { id: 'album-01', slug: 'rooms-i-remember', type: 'album', author: 'Theo March', authorSlug: 'theo-march', image: '/images/portrait.png', images: ['/images/portrait.png', '/images/memory-studio.png', '/images/memory-city.png', '/images/memory-coast.png'], eyebrow: 'Album / four fragments', title: 'Rooms I remember', body: 'A small collection of places that stayed with me after I left.', date: '09.2026', views: '3.1k', stars: '7.8k', shares: '898', viewsCount: 3100, starsCount: 7800, sharesCount: 898 },
  { id: 'quote-01', slug: 'the-softest-things-last', type: 'quote', author: 'Alexandra Noir', authorSlug: 'alexandra-noir', image: '/images/hero-cover.png', eyebrow: 'Quote / kept close', title: 'The softest things are often the ones that last.', body: '— Alexandra Noir', date: 'Now', views: '8.9k', stars: '12k', shares: '1.4k', viewsCount: 8900, starsCount: 12000, sharesCount: 1400 },
  { id: 'poem-01', slug: 'the-sea-keeps-no-record', type: 'poem', author: 'Elias Vale', authorSlug: 'elias-vale', image: '/images/memory-coast.png', eyebrow: 'Poem / low tide', title: 'The sea keeps no record', body: 'but I do.\nA line of light,\na door left open,\nthe sound of your name\nbecoming weather.', date: '08.2014', views: '5.6k', stars: '9.2k', shares: '702', viewsCount: 5600, starsCount: 9200, sharesCount: 702 },
  { id: 'note-01', slug: 'a-note-on-paying-attention', type: 'note', author: 'Theo March', authorSlug: 'theo-march', image: '', eyebrow: 'Note / from the desk', title: 'A note on paying attention', body: 'The day does not need to become extraordinary before it becomes worth keeping. Start with what is already here.', date: '09.2026', views: '2.7k', stars: '6.4k', shares: '318', viewsCount: 2700, starsCount: 6400, sharesCount: 318 },
]

export function getPerson(slug: string) {
  return people.find((person) => person.slug === slug)
}

export const profileMemories = [
  { image: '/images/memory-coast.png', date: '08.2014', place: 'North Atlantic', title: 'Where the world went quiet', story: 'A long walk at the edge of the map. The wind did most of the talking.' },
  { image: '/images/memory-studio.png', date: '11.2018', place: 'East London', title: 'The room with good light', story: 'A borrowed studio, an unfinished idea, and the first time the work felt like mine.' },
  { image: '/images/memory-city.png', date: '03.2022', place: 'Tokyo, Japan', title: 'After the rain', story: 'A city in reflection. Everyone moving, briefly illuminated.' },
]
export const profileGallery = ['/images/portrait.png', '/images/hero-cover.png', '/images/memory-studio.png', '/images/memory-city.png', '/images/memory-coast.png']