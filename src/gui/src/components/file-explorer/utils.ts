import { Folder, FolderOpen, File, FileQuestion } from 'lucide-react'

import type { FileExplorerItem } from '@/components/file-explorer/file-explorer.tsx'
import type { LucideProps } from 'lucide-react'

export const getIcon = (
  type: FileExplorerItem['type'],
  isOpen?: boolean,
): React.FC<LucideProps> => {
  switch (type) {
    case 'file':
      return File
    case 'directory':
      return isOpen ? FolderOpen : Folder
    case 'other':
      return FileQuestion
    default:
      return FileQuestion
  }
}
