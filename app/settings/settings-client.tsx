'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, LogOut, Save } from 'lucide-react'
import { ApiError, disableAccount, updateAccount, type FieldErrors } from '@/lib/client-api'
import { authClient } from '@/lib/auth-client'

export default function SettingsClient({ name, email, image, slug, nameLockedUntil }: { name: string; email: string; image: string; slug: string; nameLockedUntil: string | null }) {
  const router = useRouter()
  const [nextName, setNextName] = useState(name)
  const [lockedUntil, setLockedUntil] = useState(nameLockedUntil)
  const [nextEmail, setNextEmail] = useState(email)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const [confirmDisable, setConfirmDisable] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    setFieldErrors({})
    setFormError(null)
    try {
      const trimmedName = nextName.trim()
      if (trimmedName !== name) {
        const account = await updateAccount({ name: trimmedName })
        setLockedUntil(account.nameLockedUntil)
      }
      const trimmedEmail = nextEmail.trim()
      if (trimmedEmail !== email) {
        const result = await authClient.changeEmail({ newEmail: trimmedEmail })
        if (result.error) throw new ApiError(400, result.error.message || 'Could not change that email')
      }
      setSaved(true)
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors)
        setFormError(error.message)
      } else {
        setFormError('Could not save your account')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await authClient.signOut()
    router.replace('/')
    router.refresh()
  }

  async function handleDisable() {
    setDisabling(true)
    setFormError(null)
    try {
      await disableAccount()
      try {
        await authClient.signOut()
      } catch {
        // The session is already revoked; clearing the cookie is best effort.
      }
      router.replace('/')
      router.refresh()
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Could not disable your account')
      setDisabling(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    setFormError(null)
    try {
      const result = await authClient.deleteUser({ callbackURL: '/' })
      if (result.error) throw new ApiError(400, result.error.message || 'Could not delete your account')
      router.replace('/')
      router.refresh()
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Could not delete your account')
      setDeleting(false)
    }
  }

  const lockLabel = lockedUntil ? new Date(lockedUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null

  return (
    <div className="create-layout settings-layout">
      <section className="create-intro">
        <p className="feed-kicker">Your account</p>
        <h1>Keep it,<br /><em>or close it.</em></h1>
        <p className="create-note">Change how you are addressed, move to a new address, or step away from the archive entirely.</p>
        <div className="settings-identity">
          <img src={image} alt="" />
          <span>{name}</span>
          <small>{email}</small>
        </div>
      </section>

      <div className="settings-body">
        <form className="create-form" onSubmit={handleSave}>
          <div className="create-fields">
            <label className="create-field">
              <span className="edit-split-label">01 / Name <em>{nextName.length}/80</em></span>
              <input value={nextName} onChange={(event) => { setNextName(event.target.value); setSaved(false) }} placeholder="How should we address you?" required maxLength={80} autoComplete="name" disabled={!!lockedUntil} />
              {lockedUntil && <p className="settings-hint">You can change your name again on {lockLabel}.</p>}
              {fieldErrors.name && <p className="create-error">{fieldErrors.name}</p>}
            </label>
            <label className="create-field">
              <span>02 / Email</span>
              <input type="email" value={nextEmail} onChange={(event) => { setNextEmail(event.target.value); setSaved(false) }} placeholder="you@example.com" required autoComplete="email" />
              {fieldErrors.email && <p className="create-error">{fieldErrors.email}</p>}
            </label>
          </div>
          <div className="create-actions">
            <Link href={`/profile/${slug}`} className="create-image-button">View profile</Link>
            <button className="publish-button" type="submit" disabled={saving}>
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
            </button>
          </div>
          {formError && <p className="create-error create-error-form" role="alert">{formError}</p>}
          {!formError && saved && <p className="create-status edit-saved">Saved.</p>}
        </form>

        <section className="settings-section">
          <p className="feed-kicker">Session</p>
          <div className="settings-row">
            <div>
              <strong>Sign out</strong>
              <small>End this session on this device.</small>
            </div>
            <button type="button" className="create-image-button" onClick={() => void handleSignOut()}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </section>

        <section className="settings-section settings-danger">
          <p className="feed-kicker"><AlertTriangle size={13} aria-hidden="true" /> Danger zone</p>
          <div className="settings-row">
            <div>
              <strong>Deactivate account</strong>
              <small>Hide your profile and entries and sign out everywhere. Signing in again brings it back.</small>
            </div>
            {confirmDisable ? (
              <div className="settings-confirm">
                <button type="button" className="settings-cancel" onClick={() => setConfirmDisable(false)} disabled={disabling}>Cancel</button>
                <button type="button" className="settings-danger-button" onClick={() => void handleDisable()} disabled={disabling}>
                  {disabling ? 'Deactivating…' : 'Yes, deactivate'}
                </button>
              </div>
            ) : (
              <button type="button" className="settings-danger-button" onClick={() => setConfirmDisable(true)}>Deactivate</button>
            )}
          </div>
          <div className="settings-row">
            <div>
              <strong>Delete account</strong>
              <small>Permanently remove your account, profile, and entries. This cannot be undone.</small>
            </div>
            <div className="settings-confirm">
              <input
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                placeholder="Type DELETE"
                aria-label="Type DELETE to confirm account deletion"
              />
              <button
                type="button"
                className="settings-danger-button"
                onClick={() => void handleDelete()}
                disabled={deleteConfirm !== 'DELETE' || deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
