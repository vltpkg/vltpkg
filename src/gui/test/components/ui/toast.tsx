import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
} from '@/components/ui/toast.jsx'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('toaster render default', async () => {
  const Container = () => (
    <ToastProvider>
      <Toast>
        <ToastTitle>Title</ToastTitle>
        <ToastDescription>Description</ToastDescription>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  )
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
