import { create } from 'zustand'
import { compactCount, type FeedPostView } from '@/lib/mappers'
import * as client from '@/lib/client-api'

type FeedState = {
  posts: FeedPostView[]
  cursor: string | null
  hasMore: boolean
  loadingMore: boolean
  error: string | null
  hydrate: (posts: FeedPostView[]) => void
  prepend: (post: FeedPostView) => void
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  toggleStar: (id: string) => Promise<void>
  share: (id: string) => Promise<void>
}

function compact(posts: FeedPostView[]) {
  return posts.map((post) => ({ ...post }))
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  cursor: null,
  hasMore: false,
  loadingMore: false,
  error: null,

  hydrate: (posts) => set({ posts: compact(posts) }),

  prepend: (post) => set((state) => ({ posts: [post, ...state.posts.filter((item) => item.id !== post.id)] })),

  loadMore: async () => {
    const state = get()
    if (state.loadingMore || !state.hasMore || !state.cursor) return
    set({ loadingMore: true, error: null })
    try {
      const page = await client.listPosts({ cursor: state.cursor, limit: 12 })
      set((current) => ({
        posts: [...current.posts, ...page.posts.filter((post) => !current.posts.some((item) => item.id === post.id))],
        cursor: page.nextCursor,
        hasMore: page.hasMore,
      }))
    } catch (error) {
      set({ error: error instanceof client.ApiError ? error.message : 'Could not load more entries' })
    } finally {
      set({ loadingMore: false })
    }
  },

  refresh: async () => {
    try {
      const page = await client.listPosts({ limit: 12 })
      set({ posts: compact(page.posts), cursor: page.nextCursor, hasMore: page.hasMore, error: null })
    } catch (error) {
      set({ error: error instanceof client.ApiError ? error.message : 'Could not refresh the feed' })
    }
  },

  toggleStar: async (id) => {
    const before = get().posts
    set({
      posts: before.map((post) =>
        post.id === id
          ? {
              ...post,
              starred: !post.starred,
              starsCount: post.starsCount + (post.starred ? -1 : 1),
              stars: compactCount(post.starsCount + (post.starred ? -1 : 1)),
            }
          : post,
      ),
    })
    try {
      const result = await client.toggleStar(id)
      set((state) => ({
        posts: state.posts.map((post) => (post.id === id ? { ...post, starred: result.starred, starsCount: result.stars, stars: compactCount(result.stars) } : post)),
      }))
    } catch (error) {
      set({ posts: before, error: error instanceof client.ApiError ? error.message : 'Could not star that entry' })
    }
  },

  share: async (id) => {
    const before = get().posts
    set({
      posts: before.map((post) =>
        post.id === id ? { ...post, sharesCount: post.sharesCount + 1, shares: compactCount(post.sharesCount + 1) } : post,
      ),
    })
    try {
      const result = await client.incrementShare(id)
      set((state) => ({
        posts: state.posts.map((post) => (post.id === id ? { ...post, sharesCount: result.shares, shares: compactCount(result.shares) } : post)),
      }))
    } catch (error) {
      set({ posts: before, error: error instanceof client.ApiError ? error.message : 'Could not share that entry' })
    }
  },
}))