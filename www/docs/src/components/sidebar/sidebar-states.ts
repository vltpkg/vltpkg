const STORAGE_KEY = 'sidebar-state'
const sidebar = document.getElementById('sidebar')

type GroupState = 'open' | 'closed'

interface SidebarState {
  [group: string]: GroupState
}

/**
 * Get the current state of the sidebar from session storage.
 */
const getState = (): SidebarState => {
  try {
    return JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) ?? '{}',
    ) as SidebarState
  } catch {
    return {}
  }
}

/**
 * Store the passed state in session storage.
 */
const storeState = (state: SidebarState): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

/**
 * Toggle the state of a group in the sidebar.
 */
const toggleState = (group: string): void => {
  const s = getState()
  s[group] = s[group] === 'open' ? 'closed' : 'open'
  storeState(s)

  const groupElement = document.querySelector(
    `[data-name="${group}"] [data-state]`,
  )
  if (groupElement) {
    groupElement.setAttribute('data-state', s[group])
  }
}

/**
 * Apply stored sidebar state to the DOM on load.
 */
const applyStoredState = (): void => {
  const state = getState()
  Object.entries(state).forEach(([group, value]) => {
    const groupElement = document.querySelector(
      `[data-name="${group}"] [data-state]`,
    )
    if (groupElement) {
      groupElement.setAttribute('data-state', value)
    }
  })
}
document.addEventListener('DOMContentLoaded', applyStoredState)

sidebar?.addEventListener('click', e => {
  if (!(e.target instanceof Element)) return

  const group = e.target.closest('[data-group]')
  const groupName = group?.getAttribute('data-name')

  if (group && !e.target.matches('button')) {
    return
  }

  if (group && e.target.matches('button')) {
    if (groupName) {
      toggleState(groupName)

      /**
       * If the group is closed, and the user selects the group, we want to automatically
       * navigate to the first link in the group for convenience.
       */
      if (
        group
          .querySelector('[data-state]')
          ?.getAttribute('data-state') !== 'closed'
      ) {
        const firstLinkInstance = group.querySelector('a')
        if (firstLinkInstance) {
          window.location.href = firstLinkInstance.href
          return
        }
      }
    }
  }
})
