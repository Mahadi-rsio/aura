import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get('biography_admin')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const section = String(formData.get('section') || 'archive').replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Please choose an image file' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Images must be smaller than 10MB' }, { status: 400 })
  }

  const blob = await put(`biography/${section}/${Date.now()}-${file.name}`, file, {
    access: 'public',
    addRandomSuffix: true,
  })
  return NextResponse.json({ url: blob.url, pathname: blob.pathname, section })
}
