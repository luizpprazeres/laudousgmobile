'use client'

import type { OrganSchema, OrganState } from '@/lib/deterministic'
import { RENAL_MEASUREMENT_KEYS, renalMeasurementsEnabled, toggleRenalMeasurements } from './renalMeasurementsState'

export function RenalMeasurementsFields({ schema, state, onChange }: {
  schema: OrganSchema
  state: OrganState
  onChange: (next: OrganState) => void
}) {
  const enabled = renalMeasurementsEnabled(state)
  return (
    <div className="mt-2.5 min-w-0 border-t border-gray-200 pt-2.5 dark:border-gray-800">
      <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-200">
        <input
          type="checkbox"
          checked={enabled}
          onChange={event => onChange(toggleRenalMeasurements(state, event.target.checked))}
          className="h-4 w-4 shrink-0 accent-emerald-600"
        />
        Informar medidas
      </label>
      {enabled ? (
        <div className="mt-2.5 grid min-w-0 grid-cols-2 items-end gap-2.5">
          {RENAL_MEASUREMENT_KEYS.map(key => {
            const field = schema.fields.find(field => field.key === key)
            if (!field) return null
            return (
              <label key={key} className="block min-w-0">
                <span className="mb-1.5 block text-[11px] font-medium leading-4 text-gray-600 dark:text-gray-300">{field.label}</span>
                <input
                  value={typeof state[key] === 'string' ? state[key] : ''}
                  onChange={event => onChange({ ...state, [key]: event.target.value })}
                  placeholder={field.placeholder}
                  className="h-9 w-full min-w-0 rounded-md border border-gray-200 bg-white px-2 text-[13px] text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
              </label>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
