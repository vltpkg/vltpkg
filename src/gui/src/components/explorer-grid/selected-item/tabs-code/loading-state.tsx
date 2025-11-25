import { JellyTriangleSpinner } from '@/components/ui/jelly-spinner.tsx'

export const LoadingState = () => {
  return (
    <div className="flex h-64 items-center justify-center">
      <JellyTriangleSpinner />
    </div>
  )
}
