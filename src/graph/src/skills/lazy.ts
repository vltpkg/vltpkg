import type * as Skills from './index.ts'

const load = () => import('./index.ts')

/** `listSkills`, loading the skills code on first use. */
export const listSkills: typeof Skills.listSkills = async o =>
  (await load()).listSkills(o)

/** `linkSkills`, loading the skills code on first use. */
export const linkSkills: typeof Skills.linkSkills = async o =>
  (await load()).linkSkills(o)
