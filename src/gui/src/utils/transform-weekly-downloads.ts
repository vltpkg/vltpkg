import type { DownloadsRange } from '@/lib/external-info.js'

export const transformToWeeklyDownloads = (
  downloadsRange: DownloadsRange,
): DownloadsRange => {
  const weeklyDownloads: {
    downloads: number
    day: string
  }[] = []
  let currentWeek: {
    downloads: number
    day: string
  } | null = null

  downloadsRange.downloads.forEach(
    (download: { downloads: number; day: string }) => {
      const date = new Date(download.day)
      const dayOfWeek = date.getDay()

      if (dayOfWeek === 0 || !currentWeek) {
        if (currentWeek) {
          weeklyDownloads.push(currentWeek)
        }
        currentWeek = {
          downloads: download.downloads,
          day: download.day,
        }
      } else {
        currentWeek.day = download.day
        currentWeek.downloads += download.downloads
      }
    },
  )

  return {
    start: downloadsRange.start,
    end: downloadsRange.end,
    downloads: weeklyDownloads,
  }
}
