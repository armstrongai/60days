import type { FC } from 'react'
import type { Stage } from '../types'
import clsx from 'clsx'

const stages: Stage[] = [
  'Referral',
  'Consent',
  'Testing',
  'Report Writing',
  'ARD Pending',
]

interface Props {
  stage: Stage
}

export const StagePipeline: FC<Props> = ({ stage }) => {
  const currentIndex = stages.indexOf(stage)

  return (
    <div className="flex items-center gap-1.5">
      {stages.map((s, idx) => (
        <div
          key={s}
          className={clsx(
            'h-1.5 flex-1 rounded-full',
            idx <= currentIndex
              ? 'bg-slate-900'
              : 'bg-slate-200',
          )}
        />
      ))}
    </div>
  )
}

