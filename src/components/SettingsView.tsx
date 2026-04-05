import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { saveDefaultTaskTemplate, getDefaultTaskTemplate } from '../db'
import { DistrictCalendarsSection } from './DistrictCalendarsSection'
import {
  verifyLicenseAfterActivationCodeAttempt,
  openStripeBillingPortal,
} from '../license'
import { useLicense } from '../LicenseContext'

export const SettingsView: FC = () => {
  const { canEditCaseload, stripeTrialPaymentLink } = useLicense()
  const [tplRows, setTplRows] = useState<{ text: string }[]>([])
  const [showActivation, setShowActivation] = useState(false)
  const [activationInput, setActivationInput] = useState('')
  const [activationError, setActivationError] = useState('')

  useEffect(() => {
    getDefaultTaskTemplate().then((t) => {
      setTplRows(t.tasks.map((x) => ({ text: x.text })))
    })
  }, [])

  const saveTemplate = async () => {
    if (!canEditCaseload) return
    await saveDefaultTaskTemplate(
      tplRows.filter((r) => r.text.trim()).map((r) => ({ text: r.text.trim() })),
    )
    alert('Default task template saved. New students only.')
  }

  const moveTpl = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= tplRows.length) return
    const next = [...tplRows]
    ;[next[i], next[j]] = [next[j], next[i]]
    setTplRows(next)
  }

  const submitActivation = async () => {
    setActivationError('')
    const result = await verifyLicenseAfterActivationCodeAttempt(activationInput.trim())
    if (result.ok) {
      window.location.reload()
      return
    }
    if (result.reason === 'format') {
      setActivationError(
        "That code doesn't look right — check your confirmation email and try again.",
      )
      return
    }
    setActivationError(
      'We could not verify your license. If you just purchased, wait a few minutes and try again. Contact support at support@thelearningindex.com if this keeps happening.',
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <DistrictCalendarsSection canEdit={canEditCaseload} />

      <section className="rounded-lg border border-navy/10 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-navy">Account</h2>
        <p className="mt-1 text-sm text-navy/70">
          If you purchased a license, enter the activation code from your confirmation
          email here.
        </p>
        <p className="mt-3 text-sm text-navy/80">
          New here?{' '}
          <a
            href={stripeTrialPaymentLink}
            className="font-medium text-navy underline decoration-navy/30 underline-offset-2"
          >
            Start a free trial or subscribe
          </a>{' '}
          — you&apos;ll use the same email you sign up with in this app.
        </p>
        {!showActivation ? (
          <button
            type="button"
            className="mt-3 text-sm font-medium text-navy underline"
            onClick={() => setShowActivation(true)}
          >
            Enter activation code
          </button>
        ) : (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-navy">Activation code</label>
              <input
                className="mt-1 rounded border border-navy/20 px-2 py-1.5 text-sm"
                placeholder="45D-XXXXXXXX"
                value={activationInput}
                onChange={(e) => setActivationInput(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-white"
              onClick={submitActivation}
            >
              Submit
            </button>
            {activationError && (
              <p className="w-full text-sm text-red-600">{activationError}</p>
            )}
          </div>
        )}
        <div className="mt-6 border-t border-navy/10 pt-4">
          <button
            type="button"
            className="text-sm font-medium text-navy underline decoration-navy/30 underline-offset-2"
            onClick={() => void openStripeBillingPortal()}
          >
            Manage billing and subscription
          </button>
          <p className="mt-1 text-xs text-navy/55">
            Update your card, view invoices, or cancel — opens a secure Stripe page.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-navy/10 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-navy">Default task template</h2>
        <p className="mt-1 text-sm text-navy/70">
          Reorder, edit, or remove tasks. Applies to <strong>new students only</strong>.
        </p>
        <ul className="mt-4 space-y-2">
          {tplRows.map((row, i) => (
            <li key={i} className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="text-[10px] text-navy/60"
                  onClick={() => moveTpl(i, -1)}
                  disabled={i === 0 || !canEditCaseload}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="text-[10px] text-navy/60"
                  onClick={() => moveTpl(i, 1)}
                  disabled={i === tplRows.length - 1 || !canEditCaseload}
                >
                  ↓
                </button>
              </div>
              <input
                className="min-w-0 flex-1 rounded border border-navy/20 px-2 py-1 text-sm disabled:opacity-50"
                value={row.text}
                disabled={!canEditCaseload}
                onChange={(e) =>
                  setTplRows((rows) =>
                    rows.map((r, j) => (j === i ? { text: e.target.value } : r)),
                  )
                }
              />
              <button
                type="button"
                className="text-xs text-red-600 disabled:opacity-50"
                disabled={!canEditCaseload}
                onClick={() => setTplRows((rows) => rows.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-2 text-sm text-navy underline disabled:opacity-50"
          disabled={!canEditCaseload}
          onClick={() => setTplRows((r) => [...r, { text: '' }])}
        >
          + Add task line
        </button>
        <div className="mt-4">
          <button
            type="button"
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy disabled:opacity-50"
            disabled={!canEditCaseload}
            onClick={saveTemplate}
          >
            Save template
          </button>
        </div>
      </section>
    </div>
  )
}
