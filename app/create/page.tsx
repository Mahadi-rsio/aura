'use client'

import { FormEvent, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ImagePlus, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { postTypeSpecs } from '@/lib/post-types'
import { useComposerStore } from '@/store/composer'

const numberValue = (value: string) => (value === '' ? undefined : Number(value))

export default function CreatePage() {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const {
    type,
    values,
    media,
    fieldErrors,
    formError,
    submitting,
    setType,
    setValue,
    addFiles,
    removeMedia,
    retryUpload,
    submit,
    restore,
  } = useComposerStore()

  useEffect(() => {
    restore()
  }, [restore])

  const spec = postTypeSpecs.find((item) => item.type === type) ?? postTypeSpecs[0]
  const showsMood = spec.fields.includes('moodScore')
  const showsAttribution = spec.fields.includes('attribution')
  const showsPlaceAndDate = type === 'memory' || type === 'achievement'
  const acceptsImages = spec.allowsImages

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const post = await submit()
    if (post) router.push('/')
  }

  return (
    <main className="create-page">
      <header className="create-header">
        <Link href="/" className="create-back"><ArrowLeft size={15} /> Back to Aura</Link>
        <span className="create-header-label">New entry / 2026</span>
      </header>
      <div className="create-layout">
        <section className="create-intro">
          <p className="feed-kicker">The archive grows</p>
          <h1>Make something<br /><em>worth keeping.</em></h1>
          <p className="create-note">A small space for a feeling, a memory, or a sentence that should not disappear.</p>
          <div className="create-mark"><Sparkles size={18} /><span>01 — compose slowly</span></div>
        </section>
        <form className="create-form" onSubmit={handleSubmit}>
          <div className="create-field create-type-field">
            <label>01 / What are you making?</label>
            <div className="type-grid">
              {postTypeSpecs.map((item) => (
                <button key={item.type} type="button" title={item.blurb} className={type === item.type ? 'is-selected' : ''} onClick={() => setType(item.type)}>
                  {item.type}
                </button>
              ))}
            </div>
            <span className="create-status">{spec.blurb}</span>
            {fieldErrors.type && <p className="create-error">{fieldErrors.type}</p>}
          </div>

          <div className="create-fields">
            <label className="create-field">
              <span>02 / Title</span>
              <input value={values.title} onChange={(event) => setValue('title', event.target.value)} placeholder="Give it a name" required />
              {fieldErrors.title && <p className="create-error">{fieldErrors.title}</p>}
            </label>

            <label className="create-field">
              <span>03 / The words</span>
              <textarea
                value={values.body}
                onChange={(event) => setValue('body', event.target.value)}
                placeholder={type === 'poem' ? 'Let the lines breathe.' : 'What should remain?'}
                rows={type === 'poem' ? 10 : 6}
                required
              />
              {fieldErrors.body && <p className="create-error">{fieldErrors.body}</p>}
            </label>

            {showsMood && (
              <label className="create-field create-slider">
                <span>04 / Intensity — {values.moodScore}/10</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={values.moodScore}
                  onChange={(event) => setValue('moodScore', numberValue(event.target.value) ?? 5)}
                />
                {fieldErrors.moodScore && <p className="create-error">{fieldErrors.moodScore}</p>}
              </label>
            )}

            {showsAttribution && (
              <label className="create-field">
                <span>04 / Attribution</span>
                <input value={values.attribution} onChange={(event) => setValue('attribution', event.target.value)} placeholder="Whose words are these?" />
                {fieldErrors.attribution && <p className="create-error">{fieldErrors.attribution}</p>}
              </label>
            )}

            {showsPlaceAndDate && (
              <div className="create-split">
                <label className="create-field">
                  <span>04 / Place</span>
                  <input value={values.place} onChange={(event) => setValue('place', event.target.value)} placeholder="Somewhere" />
                  {fieldErrors.place && <p className="create-error">{fieldErrors.place}</p>}
                </label>
                <label className="create-field">
                  <span>05 / Date</span>
                  <input type="date" value={values.occurredOn} onChange={(event) => setValue('occurredOn', event.target.value)} />
                  {fieldErrors.occurredOn && <p className="create-error">{fieldErrors.occurredOn}</p>}
                </label>
              </div>
            )}

            {acceptsImages && (
              <div className="create-field composer-media">
                <span>06 / Images {spec.minImages > 0 && <em>· {spec.minImages}–{spec.maxImages}</em>}</span>
                <label className="composer-dropzone">
                  <ImagePlus size={26} strokeWidth={1} />
                  <strong>{media.length ? `${media.length} attached` : 'Choose images'}</strong>
                  <span>PNG, JPG or WEBP · 10MB maximum</span>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple={spec.maxImages > 1}
                    onChange={(event) => {
                      addFiles([...(event.target.files ?? [])])
                      event.target.value = ''
                    }}
                  />
                </label>
                {fieldErrors.mediaIds && <p className="create-error">{fieldErrors.mediaIds}</p>}
                {media.length > 0 && (
                  <div className="composer-thumbs">
                    {media.map((item) => (
                      <div className={`composer-thumb is-${item.status}`} key={item.localId}>
                        {item.previewUrl ? <img src={item.previewUrl} alt="" /> : <span className="composer-thumb-blank" />}
                        {item.status === 'uploading' && (
                          <span className="upload-bar"><span style={{ width: `${item.progress}%` }} /></span>
                        )}
                        {item.status === 'error' && (
                          <button type="button" className="composer-thumb-retry" onClick={() => void retryUpload(item.localId)} aria-label="Retry upload">
                            <RefreshCw size={14} />
                          </button>
                        )}
                        <button type="button" className="composer-thumb-remove" onClick={() => removeMedia(item.localId)} aria-label="Remove image">
                          <Trash2 size={14} />
                        </button>
                        {item.status === 'done' && <span className="composer-thumb-done">Ready</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <label className="create-field">
              <span>{acceptsImages ? '07' : showsPlaceAndDate ? '06' : '04'} / Tags</span>
              <input value={values.tags} onChange={(event) => setValue('tags', event.target.value)} placeholder="memory, light, slow" />
              {fieldErrors.tags && <p className="create-error">{fieldErrors.tags}</p>}
            </label>
          </div>

          <div className="create-actions">
            {acceptsImages && (
              <button className="create-image-button" type="button" onClick={() => fileInput.current?.click()}>
                <ImagePlus size={16} /> Add image
              </button>
            )}
            <button className="publish-button" type="submit" disabled={submitting}>
              {submitting ? 'Publishing…' : 'Publish entry'}
            </button>
          </div>
          {formError && <p className="create-error create-error-form" role="alert">{formError}</p>}
        </form>
      </div>
    </main>
  )
}