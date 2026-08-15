'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { deleteMyData, type DeleteAccountState } from '@/app/settings/actions'

const CONFIRM_PHRASE = 'DELETE'

/**
 * Two-step deletion confirmation (TASK-037). Step 1 reveals the danger zone
 * and what it deletes; step 2 requires typing "DELETE" before the button
 * that actually calls the server action becomes clickable — accidental
 * double-clicks or muscle-memory clicks cannot trigger a hard delete.
 */
export function DeleteDataSection() {
  const [revealed, setRevealed] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [state, setState] = useState<DeleteAccountState>({})
  const [isPending, startTransition] = useTransition()

  const canConfirm = confirmText.trim() === CONFIRM_PHRASE

  function handleDelete() {
    const formData = new FormData()
    formData.set('confirm', confirmText.trim())
    startTransition(async () => {
      // A successful deletion redirects server-side and never returns here.
      const next = await deleteMyData({}, formData)
      setState(next)
    })
  }

  return (
    <Card tone="light" className="border border-terra/40 p-6">
      <h2 className="text-lg font-bold text-ink-900">Delete my data</h2>
      <p className="mt-2 text-sm text-ink-700">
        Permanently deletes your Career Profile, work history, skills, certifications, education,
        and every saved package in your Library. This is a real deletion, not a hide — it cannot
        be undone. Your login stays active; you would start onboarding fresh.
      </p>

      {!revealed ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-4 border-terra text-terra hover:bg-terra/5"
          onClick={() => setRevealed(true)}
        >
          Delete my data
        </Button>
      ) : (
        <div className="mt-4 flex flex-col gap-3 rounded-radius-md border border-terra/30 bg-terra/5 p-4">
          <p className="text-sm font-semibold text-terra">
            This cannot be undone. Type {CONFIRM_PHRASE} to confirm.
          </p>
          <Input
            label={`Type "${CONFIRM_PHRASE}" to confirm`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
          />

          {state?.error ? (
            <p
              role="alert"
              className="rounded-radius-md border border-terra/40 bg-terra-tint px-3 py-2 text-xs text-terra"
            >
              {state.error}
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRevealed(false)
                setConfirmText('')
                setState({})
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={!canConfirm || isPending}
              className="border border-terra bg-terra text-ink-900 hover:bg-terra/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Deleting…' : 'Permanently delete everything'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
