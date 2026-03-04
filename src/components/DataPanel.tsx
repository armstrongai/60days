import type { FC } from 'react'
import { useCallback, useState } from 'react'
import {
  archiveCompletedStudents,
  backupAll,
  restoreFromBackup,
  type BackupPayload,
} from '../useStudents'
import { setDistrictCalendar } from '../db'
import { parseCalendarFile } from '../dateUtils'

interface Props {
  onAfterChange?: () => void
}

export const DataPanel: FC<Props> = ({ onAfterChange }) => {
  const [calendarError, setCalendarError] = useState<string | null>(null)

  const handleBackup = async () => {
    const data = await backupAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const date = new Date().toISOString().slice(0, 10)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `45days-backup-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRestore = async (mode: 'merge' | 'replace') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const payload = JSON.parse(text) as BackupPayload
        if (!Array.isArray(payload.students)) {
          throw new Error('Invalid backup file')
        }
        await restoreFromBackup(payload, mode)
        onAfterChange?.()
      } catch (e) {
        console.error(e)
        alert('Sorry, that file does not look like a valid 45Days backup.')
      }
    }
    input.click()
  }

  const handleArchiveCompleted = async () => {
    await archiveCompletedStudents()
    onAfterChange?.()
  }

  const handleUploadCalendar = useCallback(() => {
    setCalendarError(null)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,.json,text/csv,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        let nonSchoolDays: string[]
        if (file.name.toLowerCase().endsWith('.json')) {
          const data = JSON.parse(text) as { nonSchoolDays?: string[] }
          nonSchoolDays = Array.isArray(data.nonSchoolDays)
            ? data.nonSchoolDays
            : []
        } else {
          nonSchoolDays = parseCalendarFile(text)
        }
        await setDistrictCalendar(nonSchoolDays)
        setCalendarError(null)
        alert(`Uploaded ${nonSchoolDays.length} non-school day(s). FIIE due dates use 45 school days from referral.`)
      } catch (e) {
        console.error(e)
        setCalendarError('Invalid file. Use CSV (one date YYYY-MM-DD per line) or JSON: { "nonSchoolDays": ["2025-09-01", ...] }.')
      }
    }
    input.click()
  }, [])

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
      <div className="font-semibold text-slate-900">Data &amp; calendar</div>
      <p>
        Your caseload never leaves this device. Use backups if you switch
        computers or want an extra safety net.
      </p>

      <div>
        <div className="font-medium text-slate-800">District calendar</div>
        <p className="mt-0.5 text-slate-600">
          Upload holidays/breaks so FIIE due = 45 <em>school</em> days from
          referral.
        </p>
        <button
          type="button"
          onClick={handleUploadCalendar}
          className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
        >
          Upload district calendar
        </button>
        {calendarError && (
          <p className="mt-1 text-red-600">{calendarError}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={handleBackup}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Back up my data
        </button>
        <button
          type="button"
          onClick={() => handleRestore('merge')}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
        >
          Restore (merge)
        </button>
        <button
          type="button"
          onClick={() => handleRestore('replace')}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
        >
          Restore (replace all)
        </button>
        <button
          type="button"
          onClick={handleArchiveCompleted}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
        >
          Archive completed cases
        </button>
      </div>
    </div>
  )
}
