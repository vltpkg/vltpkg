/**
 * Eval cases for the dss-query skill.
 *
 * Grading is deterministic — no LLM judge:
 * - expectSkill: the dss-query skill must (not) be invoked for this prompt
 * - selectors extracted from the response must parse via @vltpkg/dss-parser
 * - expectSelector: at least one extracted selector matches this pattern
 * - expectText: response text matches every pattern (for explain-style cases)
 */
export type EvalCase = {
  name: string
  prompt: string
  /** should the dss-query skill fire? default true */
  expectSkill?: boolean
  /** pattern at least one extracted DSS selector must match */
  expectSelector?: RegExp
  /** patterns the response text must match */
  expectText?: RegExp[]
}

export const cases: EvalCase[] = [
  {
    name: 'trigger: outdated direct deps',
    prompt:
      'How do I find outdated direct dependencies of my project root with vlt?',
    expectSelector: /:root\s*>\s*:outdated/,
  },
  {
    name: 'compose: workspace copyleft prod deps',
    prompt:
      'Write a DSS query for prod dependencies of my workspaces that have a copyleft license.',
    expectSelector:
      /:workspace.*:prod|:workspace.*:license\(copyleft\)/,
  },
  {
    name: 'compose: inverted direction (dependents)',
    prompt:
      'What vlt query shows me which packages directly depend on react?',
    expectSelector: /:has\(\s*>\s*(#react|\[name=react\])\s*\)/,
  },
  {
    name: 'explain: decompose a query',
    prompt: `What does the vlt query ':workspace > :prod:cve(*)' do?`,
    expectText: [/direct/i, /prod/i, /CVE/i],
  },
  {
    name: 'negative trigger: unrelated question',
    prompt: 'What is the capital of France?',
    expectSkill: false,
  },
]
