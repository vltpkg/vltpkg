import type { Props } from '@astrojs/starlight/props'

type SidebarEntry = Props['sidebar'][number]

/** A single segment of the breadcrumb trail. */
export type Crumb = {
  /** Human-readable text, from the sidebar label when available. */
  label: string
  /**
   * Absolute path this crumb links to. Only set for non-final crumbs
   * that resolve to a real page, so the trail never links to a 404.
   */
  href?: string
}

/** Sidebar labels indexed by path, split by what they describe. */
type LabelMaps = {
  /** Page href (trailing slash removed) → its sidebar link label. */
  links: Map<string, string>
  /** Directory path → the label of the sidebar group covering it. */
  groups: Map<string, string>
}

/** Strip any trailing slash from an href for use as a map key. */
const normalize = (href: string): string => href.replace(/\/$/, '')

/**
 * Directories whose children are named after code identifiers —
 * command names and package names — and must keep their exact
 * casing in breadcrumbs instead of being humanized.
 */
const CASE_SENSITIVE_DIRS = ['/cli/commands', '/packages']

/**
 * Whether a path's label must be shown verbatim because it lives
 * under a directory of code identifiers (see CASE_SENSITIVE_DIRS).
 *
 * @param path - Accumulated crumb path, e.g. `/cli/commands/install`.
 */
const preservesCase = (path: string): boolean =>
  CASE_SENSITIVE_DIRS.some(dir => path.startsWith(`${dir}/`))

/**
 * Make a raw URL segment presentable: capitalize the first letter
 * and turn hyphens into spaces, e.g. `getting-started` →
 * `Getting started`.
 *
 * @param segment - A single lowercase URL path segment.
 */
const humanize = (segment: string): string =>
  segment.charAt(0).toUpperCase() +
  segment.slice(1).replace(/-/g, ' ')

/** Collect the hrefs of every link nested under a sidebar entry. */
const collectHrefs = (entry: SidebarEntry): string[] =>
  entry.type === 'link' ?
    [normalize(entry.href)]
  : entry.entries.flatMap(collectHrefs)

/**
 * Find the directory path a group of hrefs has in common — the
 * longest shared segment prefix, minus the final segment when the
 * group holds a single page (a page is not a directory).
 *
 * @param hrefs - Normalized hrefs of every link in a sidebar group.
 * @returns The shared path like `/cli/commands`, or `undefined` when
 * the group's links share no common directory.
 */
const commonDir = (hrefs: string[]): string | undefined => {
  if (hrefs.length === 0) return undefined
  const split = hrefs.map(href => href.split('/').filter(Boolean))
  const [first, ...rest] = split as [string[], ...string[][]]
  let prefix = first
  for (const segments of rest) {
    let idx = 0
    while (
      idx < prefix.length &&
      idx < segments.length &&
      prefix[idx] === segments[idx]
    ) {
      idx++
    }
    prefix = prefix.slice(0, idx)
  }
  if (hrefs.length === 1) prefix = prefix.slice(0, -1)
  return prefix.length ? `/${prefix.join('/')}` : undefined
}

/**
 * Find the directory a sidebar group covers. Prefers the directory
 * shared by the group's direct link children, so a group keeps its
 * own directory even when it nests a subgroup living elsewhere
 * (e.g. a "Client" group over `/cli` that also contains the
 * `/packages` API reference). Falls back to the directory shared by
 * every descendant link for groups made up only of subgroups.
 *
 * @param group - A sidebar group entry.
 * @returns The covered path like `/cli`, or `undefined` when the
 * group's links share no common directory.
 */
const groupDir = (
  group: Extract<SidebarEntry, { type: 'group' }>,
): string | undefined => {
  const directLinks = group.entries
    .filter(entry => entry.type === 'link')
    .map(entry => normalize(entry.href))
  return commonDir(directLinks) ?? commonDir(collectHrefs(group))
}

/**
 * Flatten Starlight's resolved sidebar into label lookups: page
 * labels keyed by href, and group labels keyed by the directory
 * their links share (e.g. the "Client" group covering `/cli`).
 *
 * @param entries - Sidebar entries as passed to component overrides
 * via `Astro.props.sidebar`; group entries are walked recursively.
 * @param maps - Accumulator used during recursion.
 * @returns Label maps for both pages and groups.
 */
const collectLabels = (
  entries: SidebarEntry[],
  maps: LabelMaps = { links: new Map(), groups: new Map() },
): LabelMaps => {
  for (const entry of entries) {
    if (entry.type === 'link') {
      maps.links.set(normalize(entry.href), entry.label)
    } else {
      const dir = groupDir(entry)
      if (dir && !maps.groups.has(dir)) {
        maps.groups.set(dir, entry.label)
      }
      collectLabels(entry.entries, maps)
    }
  }
  return maps
}

/**
 * Build the breadcrumb trail for a page from its URL path.
 *
 * Owns all breadcrumb policy in one place:
 *
 * - Pages nested one level deep or less get no trail (returns `[]`).
 * - Labels come from the resolved sidebar, so they stay in sync with
 *   sidebar config and frontmatter. Intermediate crumbs prefer the
 *   section (group) label — `Registry › Publishing` rather than the
 *   index page's own label — while the final crumb uses the page's
 *   link label. Raw URL segments are the fallback for paths the
 *   sidebar doesn't describe: humanized in prose sections, verbatim
 *   under directories of code identifiers (commands, packages).
 * - Only intermediate segments that exist as real pages are linked.
 *
 * @param pathname - The page's URL path, e.g. `/registry/publishing`.
 * @param sidebar - The resolved sidebar from `Astro.props.sidebar`.
 * @returns Crumbs in root-to-page order, or `[]` when hidden.
 */
export const getBreadcrumbs = (
  pathname: string,
  sidebar: SidebarEntry[],
): Crumb[] => {
  const segments = pathname
    .replace(/^\/|\/$/g, '')
    .split('/')
    .filter(Boolean)
  if (segments.length < 2) return []

  const { links, groups } = collectLabels(sidebar)
  let path = ''
  return segments.map((segment, idx) => {
    path += `/${segment}`
    const isLast = idx === segments.length - 1
    const fallback = preservesCase(path) ? segment : humanize(segment)
    const label =
      isLast ?
        (links.get(path) ?? groups.get(path) ?? fallback)
      : (groups.get(path) ?? links.get(path) ?? fallback)
    return {
      label,
      href: !isLast && links.has(path) ? path : undefined,
    }
  })
}
