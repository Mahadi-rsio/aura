'use client'

import { FormEvent, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Save, Trash2, Upload } from 'lucide-react'
import { ApiError, updateProfile, uploadImage, type FieldErrors } from '@/lib/client-api'
import { profileAccents } from '@/lib/validation/profile'
import type { ProfileEditView } from '@/lib/mappers'

type LinkRow = { label: string; url: string }
type Accent = (typeof profileAccents)[number]

const blankRow = (): LinkRow => ({ label: '', url: '' })

function initialAccent(value: string): Accent {
  return (profileAccents as readonly string[]).includes(value) ? (value as Accent) : '01'
}

export default function EditProfileClient({ profile }: { profile: ProfileEditView }) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(profile.name)
  const [role, setRole] = useState(profile.role)
  const [location, setLocation] = useState(profile.location)
  const [statement, setStatement] = useState(profile.statement)
  const [bio, setBio] = useState(profile.bio)
  const [accent, setAccent] = useState<Accent>(initialAccent(profile.accent))
  const [tags, setTags] = useState(profile.tags.join(', '))
  const [links, setLinks] = useState<LinkRow[]>(profile.links.length ? profile.links : [blankRow()])
  const [imageKey, setImageKey] = useState(profile.imageKey)
  const [portrait, setPortrait] = useState(profile.image)
  const [uploading, setUploading] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function updateRow(index: number, patch: Partial<LinkRow>) {
    setLinks((current) => current.map((row, at) => (at === index ? { ...row, ...patch } : row)))
    setSaved(false)
  }

  function removeRow(index: number) {
    setLinks((current) => (current.length === 1 ? [blankRow()] : current.filter((_, at) => at !== index)))
    setSaved(false)
  }

  async function onPickPortrait(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFormError('The portrait must be an image file')
      return
    }
    setUploading(true)
    setUploadPercent(0)
    setFormError(null)
    setSaved(false)
    try {
      const uploaded = await uploadImage(file, (percent) => setUploadPercent(percent))
      setImageKey(uploaded.key)
      setPortrait(uploaded.url)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'That portrait did not upload')
    } finally {
      setUploading(false)
      setUploadPercent(0)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploading) {
      setFormError('Wait for the portrait to finish uploading')
      return
    }
    setSaving(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const next = await updateProfile({
        name,
        role,
        location,
        statement,
        bio,
        accent,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        links: links
          .filter((row) => row.label.trim() || row.url.trim())
          .map((row) => ({ label: row.label.trim(), url: row.url.trim() })),
        imageKey,
      })
      setSaved(true)
      router.replace(`/profile/${next.slug}`)
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors)
        setFormError(error.status === 422 ? 'Some details are still missing' : error.message)
      } else {
        setFormError('Could not save your profile')
      }
    } finally {
      setSaving(false)
    }
  }

  const linkError = (index: number, key: 'label' | 'url') =>
    fieldErrors[`links.${index}.${key}`] ?? fieldErrors.links

  return (
    <div className="create-layout">
      <section className="create-intro">
        <p className="feed-kicker">Your record, revised</p>
        <h1>Edit the<br /><em>details.</em></h1>
        <p className="create-note">A profile is a sentence about a person. Change any part of it; the address stays the same.</p>
        <div className="create-mark"><Save size={18} /><span>Only you can see this form</span></div>
      </section>

      <form className="create-form" onSubmit={handleSubmit}>
        <div className="create-field composer-media edit-portrait-field">
          <span>01 / Portrait</span>
          <div className="edit-portrait">
            <div className="edit-portrait-image">
              <img src={portrait} alt="Your current portrait" />
              {uploading && <span className="upload-bar"><span style={{ width: `${uploadPercent}%` }} /></span>}
            </div>
            <div className="edit-portrait-actions">
              <button type="button" className="create-image-button" onClick={() => fileInput.current?.click()} disabled={uploading}>
                <Upload size={15} /> {uploading ? 'Uploading…' : 'Choose a new portrait'}
              </button>
              <button
                type="button"
                className="edit-clear"
                onClick={() => {
                  setImageKey(null)
                  setPortrait('/images/portrait.png')
                  setSaved(false)
                }}
              >
                Use the archive default
              </button>
              <span className="create-status">PNG, JPG or WEBP · 10MB maximum</span>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => {
                void onPickPortrait(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </div>
        </div>

        <div className="create-fields">
          <label className="create-field">
            <span className="edit-split-label">02 / Name <em>{name.length}/80</em></span>
            <input value={name} onChange={(event) => { setName(event.target.value); setSaved(false) }} placeholder="How should we address you?" required maxLength={80} />
            {fieldErrors.name && <p className="create-error">{fieldErrors.name}</p>}
          </label>

          <div className="create-split">
            <label className="create-field">
              <span>03 / Role</span>
              <input value={role} onChange={(event) => { setRole(event.target.value); setSaved(false) }} placeholder="What you do" maxLength={80} />
              {fieldErrors.role && <p className="create-error">{fieldErrors.role}</p>}
            </label>
            <label className="create-field">
              <span>04 / Location</span>
              <input value={location} onChange={(event) => { setLocation(event.target.value); setSaved(false) }} placeholder="Where you are" maxLength={120} />
              {fieldErrors.location && <p className="create-error">{fieldErrors.location}</p>}
            </label>
          </div>

          <label className="create-field">
            <span className="edit-split-label">05 / Statement <em>{statement.length}/280</em></span>
            <textarea
              value={statement}
              onChange={(event) => { setStatement(event.target.value); setSaved(false) }}
              placeholder="One line that sits under your name."
              rows={2}
              maxLength={280}
            />
            {fieldErrors.statement && <p className="create-error">{fieldErrors.statement}</p>}
          </label>

          <label className="create-field">
            <span className="edit-split-label">06 / Biography <em>{bio.length}/4000</em></span>
            <textarea
              value={bio}
              onChange={(event) => { setBio(event.target.value); setSaved(false) }}
              placeholder="The longer account, for anyone who stays a while."
              rows={8}
              maxLength={4000}
            />
            {fieldErrors.bio && <p className="create-error">{fieldErrors.bio}</p>}
          </label>

          <div className="create-field">
            <span>07 / Accent</span>
            <div className="type-grid">
              {profileAccents.map((value) => (
                <button key={value} type="button" className={accent === value ? 'is-selected' : ''} onClick={() => { setAccent(value); setSaved(false) }}>
                  {value}
                </button>
              ))}
            </div>
            {fieldErrors.accent && <p className="create-error">{fieldErrors.accent}</p>}
          </div>

          <label className="create-field">
            <span>08 / Tags</span>
            <input value={tags} onChange={(event) => { setTags(event.target.value); setSaved(false) }} placeholder="memory, light, slow" />
            <span className="create-status">Comma separated · up to 12</span>
            {fieldErrors.tags && <p className="create-error">{fieldErrors.tags}</p>}
          </label>
        </div>

        <div className="create-field edit-links-field">
          <span>09 / Elsewhere</span>
          <div className="edit-links">
            {links.map((row, index) => (
              <div className="edit-link-row" key={index}>
                <label className="edit-link-cell">
                  <em>Label</em>
                  <input
                    value={row.label}
                    onChange={(event) => updateRow(index, { label: event.target.value })}
                    placeholder="website"
                    maxLength={40}
                  />
                </label>
                <label className="edit-link-cell">
                  <em>Address</em>
                  <input
                    value={row.url}
                    onChange={(event) => updateRow(index, { url: event.target.value })}
                    placeholder="https://"
                    maxLength={300}
                  />
                </label>
                <button type="button" className="edit-link-remove" onClick={() => removeRow(index)} aria-label="Remove link">
                  <Trash2 size={14} />
                </button>
                {linkError(index, 'label') && <p className="create-error edit-link-error">{linkError(index, 'label')}</p>}
                {linkError(index, 'url') && <p className="create-error edit-link-error">{linkError(index, 'url')}</p>}
              </div>
            ))}
          </div>
          <button type="button" className="edit-link-add" onClick={() => setLinks((current) => [...current, blankRow()])} disabled={links.length >= 8}>
            <Plus size={14} /> Add a link
          </button>
          {fieldErrors.links && !links.some((_, index) => linkError(index, 'label') || linkError(index, 'url')) && (
            <p className="create-error">{fieldErrors.links}</p>
          )}
        </div>

        <div className="edit-slug">
          <span>Address</span>
          <strong>/profile/{profile.slug}</strong>
          <small>Fixed, so the links people saved keep working.</small>
        </div>

        <div className="create-actions">
          <Link href={`/profile/${profile.slug}`} className="create-image-button">Discard</Link>
          <button className="publish-button" type="submit" disabled={saving || uploading}>
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save profile'}
          </button>
        </div>
        {formError && <p className="create-error create-error-form" role="alert">{formError}</p>}
        {!formError && saved && <p className="create-status edit-saved">Saved. Taking you to your profile…</p>}
      </form>
    </div>
  )
}
