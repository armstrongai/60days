import type { FC } from 'react'
import {
  archiveCompletedStudents,
  backupAll,
  restoreFromBackup,
  type BackupPayload,
} from '../useStudents'

interface Props {
  onAfterChange?: () => void
}

export const DataPanel: FC<Props> = ({ onAfterChange }) => {
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

  return (
    <div className="space-y-2 rounded-lg border border-navy/10 bg-white px-4 py-3 text-xs text-navy/80">
      <div className="font-semibold text-navy">Data &amp; backup</div>
      <p>
        District calendars and task templates are managed under the{' '}
        <strong>Settings</strong> tab. Backups include your full 45Days database.
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={handleBackup}
          className="rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-light"
        >
          Back up my data
        </button>
        <button
          type="button"
          onClick={() => handleRestore('merge')}
          className="rounded-md border border-navy/20 px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy/5"
        >
          Restore (merge)
        </button>
        <button
          type="button"
          onClick={() => handleRestore('replace')}
          className="rounded-md border border-navy/20 px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy/5"
        >
          Restore (replace all)
        </button>
        <button
          type="button"
          onClick={handleArchiveCompleted}
          className="rounded-md border border-navy/20 px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy/5"
        >
          Archive completed cases
        </button>
      </div>
    </div>
  )
}
