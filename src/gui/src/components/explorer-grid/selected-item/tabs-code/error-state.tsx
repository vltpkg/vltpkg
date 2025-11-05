import { toHumanString } from '@/utils/human-string.ts'

import type { Error } from '@/components/explorer-grid/selected-item/tabs-code/types.ts'

export const ErrorState = ({ errors }: { errors: Error[] }) => {
  return (
    <div className="flex min-h-64 w-full items-center justify-center px-6 py-4">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <h3 className="text-foreground text-sm font-medium">
          An{' '}
          {toHumanString({
            count: errors.length,
            zero: 'error',
            value: 'errors',
            one: 'error',
          })}{' '}
          occured.
        </h3>
        <div className="flex flex-col">
          {errors.map((error, idx) => (
            <div
              key={`${error.origin}-${idx}`}
              className="flex flex-col gap-2">
              <h4 className="text-sm font-medium">{error.origin}</h4>
              <p className="text-muted-foreground text-sm font-medium">
                {error.cause}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
