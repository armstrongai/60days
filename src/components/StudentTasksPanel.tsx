import type { FC } from 'react'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { StudentTask } from '../types'
import { updateStudentTasks } from '../useStudents'

interface Props {
  studentId: number
  initials: string
  canEdit?: boolean
}

export const StudentTasksPanel: FC<Props> = ({
  studentId,
  initials,
  canEdit = true,
}) => {
  const student = useLiveQuery(() => db.students.get(studentId), [studentId])
  const tasks = student?.tasks ?? []
  const [newTaskText, setNewTaskText] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)

  const active = tasks.filter((t) => !t.completed)
  const done = tasks.filter((t) => t.completed)

  const persist = async (next: StudentTask[]) => {
    if (!canEdit) return
    await updateStudentTasks(studentId, next, initials)
  }

  const toggle = async (id: string) => {
    if (!canEdit) return
    const next = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    )
    await persist(next)
  }

  const updateDue = async (id: string, dueDate: string) => {
    if (!canEdit) return
    const next = tasks.map((t) =>
      t.id === id ? { ...t, dueDate: dueDate || undefined } : t,
    )
    await persist(next)
  }

  const addCustom = async () => {
    if (!canEdit) return
    const text = newTaskText.trim()
    if (!text) return
    const next: StudentTask[] = [
      ...tasks,
      {
        id: crypto.randomUUID(),
        text,
        completed: false,
        createdAt: Date.now(),
      },
    ]
    setNewTaskText('')
    await persist(next)
  }

  if (!student) return null

  return (
    <div className="rounded-md border border-navy/15 bg-tli-bg px-3 py-3 text-xs">
      <div className="font-semibold text-navy">To-do list</div>
      <ul className="mt-2 space-y-2">
        {active.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-start gap-2 rounded border border-navy/10 bg-white px-2 py-1.5"
          >
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 rounded border-navy/30"
              checked={false}
              disabled={!canEdit}
              onChange={() => toggle(t.id)}
            />
            <span className="flex-1 text-navy">{t.text}</span>
            <input
              type="date"
              value={t.dueDate ?? ''}
              onChange={(e) => updateDue(t.id, e.target.value)}
              disabled={!canEdit}
              className="rounded border border-navy/20 px-1 py-0.5 text-[11px] disabled:opacity-50"
            />
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            className="text-[11px] font-medium text-navy/70 underline"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? 'Hide' : 'Show'} completed ({done.length})
          </button>
          {showCompleted && (
            <ul className="mt-1 space-y-1">
              {done.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-2 text-navy/50 line-through"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3.5 w-3.5"
                    checked
                    disabled={!canEdit}
                    onChange={() => toggle(t.id)}
                  />
                  <span>{t.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="Add a task…"
          disabled={!canEdit}
          className="min-w-0 flex-1 rounded border border-navy/20 px-2 py-1 text-xs disabled:opacity-50"
        />
        <button
          type="button"
          className="rounded bg-navy px-2 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={addCustom}
          disabled={!canEdit}
        >
          Add
        </button>
      </div>
    </div>
  )
}
