import { useState } from 'react'
import { useStudents, type StudentsFilterState } from './useStudents'
import type { Stage, StudentRecord } from './types'
import { StatCards } from './components/StatCards'
import { StudentTable } from './components/StudentTable'
import { AddEditStudentModal } from './components/AddEditStudentModal'
import { DataPanel } from './components/DataPanel'

function JsonExportIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}

function Header({ onBackup }: { onBackup: () => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-navy/10 bg-navy">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/tli-logo.png"
            alt="The Learning Index"
            className="h-9 w-9 shrink-0 rounded-full object-contain"
          />
          <span className="text-lg font-semibold tracking-tight text-white">
            45Days
          </span>
          <span className="hidden text-sm text-white/80 sm:inline">
            Texas Educational Diagnostician caseload manager (local-only)
          </span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-gold px-3 py-2 text-sm font-medium text-navy shadow-sm hover:bg-gold-light focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-navy"
          onClick={onBackup}
        >
          <JsonExportIcon />
          One-Click Backup
        </button>
      </div>
    </header>
  )
}

function App() {
  const [filter, setFilter] = useState<StudentsFilterState>({ tab: 'all' })
  const { students, stats } = useStudents(filter)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<StudentRecord | null>(null)

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (s: StudentRecord) => {
    setEditing(s)
    setModalOpen(true)
  }

  const handleArchive = async (s: StudentRecord) => {
    if (!s.id) return
    const { archiveStudent } = await import('./useStudents')
    await archiveStudent(s.id)
  }

  const handleBackup = async () => {
    const { backupAll } = await import('./useStudents')
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

  const showEmptyState = !students.length

  return (
    <div className="min-h-dvh">
      <Header onBackup={handleBackup} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-navy">
                Caseload dashboard
              </h1>
              <p className="mt-1 text-sm text-navy/70">
                See who is most urgent at a glance. All data stays on this device.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-light"
                onClick={openAdd}
              >
                Add student
              </button>
            </div>
          </div>

          <StatCards
            total={stats.total}
            critical={stats.critical}
            atRisk={stats.atRisk}
            avgDaysRemaining={stats.avgDaysRemaining}
          />

          <div className="flex flex-col gap-3 md:flex-row md:items-start">
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-lg border border-navy/15 bg-white p-0.5 text-xs font-medium text-navy">
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 ${
                      filter.tab === 'all'
                        ? 'bg-gold text-navy shadow-sm'
                        : 'text-navy/70 hover:text-navy'
                    }`}
                    onClick={() => setFilter({ tab: 'all' })}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 ${
                      filter.tab === 'urgent'
                        ? 'bg-gold text-navy shadow-sm'
                        : 'text-navy/70 hover:text-navy'
                    }`}
                    onClick={() => setFilter({ tab: 'urgent' })}
                  >
                    Urgent (≤14 days)
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 ${
                      filter.tab === 'by-stage'
                        ? 'bg-gold text-navy shadow-sm'
                        : 'text-navy/70 hover:text-navy'
                    }`}
                    onClick={() =>
                      setFilter({
                        tab: 'by-stage',
                        stage: filter.stage ?? 'Referral',
                      })
                    }
                  >
                    By stage
                  </button>
                </div>
                {filter.tab === 'by-stage' && (
                  <select
                    value={filter.stage ?? 'Referral'}
                    onChange={(e) =>
                      setFilter({
                        tab: 'by-stage',
                        stage: e.target.value as Stage,
                      })
                    }
                    className="rounded-md border border-navy/20 bg-white px-2 py-1.5 text-xs text-navy"
                  >
                    <option value="Referral">Referral</option>
                    <option value="Consent">Consent</option>
                    <option value="Testing">Testing</option>
                    <option value="Report Writing">Report Writing</option>
                    <option value="ARD Pending">ARD Pending</option>
                    <option value="Complete">Complete</option>
                  </select>
                )}
              </div>

              {showEmptyState ? (
                <div className="rounded-lg border border-dashed border-navy/20 bg-white px-6 py-10 text-center">
                  <div className="text-base font-semibold text-navy">
                    Start your first 45 school-day caseload.
                  </div>
                  <div className="mt-1 text-sm text-navy/70">
                    Add students with initials or campus ID. You&apos;ll see FIIE/ARD
                    due dates, urgency colors, and pipeline stages here.
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-light"
                      onClick={openAdd}
                    >
                      Add your first student
                    </button>
                  </div>
                </div>
              ) : (
                <StudentTable
                  students={students}
                  onEdit={openEdit}
                  onArchive={handleArchive}
                />
              )}
            </div>

            <div className="w-full max-w-xs flex-none space-y-3">
              <DataPanel />
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t border-navy/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 text-xs text-navy/70 sm:px-6">
          Your data is stored locally on this device only. Back up regularly.
        </div>
      </footer>

      <AddEditStudentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialStudent={editing ?? undefined}
      />
    </div>
  )
}

export default App
