import { test, expect, afterEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { PackageContentItem } from '@/components/explorer-grid/selected-item/tabs-code/package-content-item.tsx'

vi.mock('@/components/ui/alert-dialog.tsx', () => ({
  AlertDialog: 'gui-alert-dialog',
  AlertDialogTrigger: 'gui-alert-dialog-trigger',
  AlertDialogTitle: 'gui-alert-dialog-title',
  AlertDialogAction: 'gui-alert-dialog-action',
  AlertDialogCancel: 'gui-alert-dialog-cancel',
  AlertDialogFooter: 'gui-alert-dialog-footer',
  AlertDialogHeader: 'gui-alert-dialog-header',
  AlertDialogContent: 'gui-alert-dialog-content',
  AlertDialogDescription: 'gui-alert-dialog-description',
}))

vi.mock('lucide-react', () => ({
  File: 'gui-file-icon',
  FileText: 'gui-file-text-icon',
  Folder: 'gui-folder-icon',
  FolderSymlink: 'gui-folder-symlink-icon',
  FileQuestion: 'gui-file-question-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('PackageContentItem renders directory row', () => {
  const { container } = render(
    <PackageContentItem
      item={{ name: 'src', type: 'directory', size: 0 }}
    />,
  )
  expect(container.innerHTML).toMatchSnapshot()
})

test('PackageContentItem renders file row with formatted size', () => {
  const { container } = render(
    <PackageContentItem
      item={{ name: 'file.ts', type: 'file', size: 1024 }}
    />,
  )
  expect(container.innerHTML).toMatchSnapshot()
})

test('PackageContentItem renders none row without icon and size', () => {
  const { container } = render(
    <PackageContentItem
      item={{ name: '../', type: 'none', size: 0 }}
    />,
  )
  expect(container.innerHTML).toMatchSnapshot()
})
