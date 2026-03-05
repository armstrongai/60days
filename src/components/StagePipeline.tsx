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
    <div className="flex items-center gap-0">
      {stages.map((label, idx) => {
        const isActive = idx <= currentIndex
        const isCurrent = idx === currentIndex
        return (
          <div key={label} className="flex flex-1 items-center">
            <div
              className={clsx(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-semibold',
                isActive
                  ? 'border-navy bg-navy text-white'
                  : 'border-gray-300 bg-white text-gray-400',
                isCurrent && 'ring-2 ring-gold ring-offset-2 ring-offset-white',
              )}
              title={label}
            >
              {idx + 1}
            </div>
            {idx < stages.length - 1 && (
              <div
                className={clsx(
                  'h-0.5 flex-1 min-w-[8px]',
                  isActive ? 'bg-navy' : 'bg-gray-200',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
