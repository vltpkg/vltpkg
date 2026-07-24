/**
 * Deterministic grader for dss-query skill evals.
 * Run from src/query (so @vltpkg/* workspace deps resolve):
 *   node skills/dss-query/evals/grade.mjs skills/dss-query-workspace/iteration-1
 *
 * Writes grading.json ({expectations: [{text, passed, evidence}]}) into each
 * <eval>/<variant>/ directory.
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
} from 'node:fs'
import { join } from 'node:path'
import { parse } from '@vltpkg/dss-parser'
import { Query } from '../../../src/index.ts'
import { getSimpleGraph } from '../../../test/fixtures/graph.ts'

const iterDir = process.argv[2]
if (!iterDir) throw new Error('usage: node grade.mjs <iteration-dir>')

// ---- selector extraction -------------------------------------------------
const extractSelectors = text => {
  const out = new Set()
  // vlt query '<sel>' / "<sel>" anywhere in the text
  for (const m of text.matchAll(/vlt query '([^']+)'/g)) out.add(m[1])
  for (const m of text.matchAll(/vlt query "([^"]+)"/g)) out.add(m[1])
  // bare selectors on their own line inside fenced code blocks
  for (const block of text.matchAll(/```[a-z]*\n([\s\S]*?)```/g)) {
    for (const line of block[1].split('\n')) {
      const t = line.trim()
      // '# ...' is a comment, not an ID selector (real IDs: '#react', no space)
      if (/^# /.test(t)) continue
      if (/^[:#[*]/.test(t) && !t.includes('<')) out.add(t)
    }
  }
  return [...out].filter(s => !s.includes('<'))
}

// ---- execution (offline only) ---------------------------------------------
// :outdated fetches registry packuments; security selectors need the archive.
const NO_EXEC = /:outdated|:missing/
const skipExec = s => Query.hasSecuritySelectors(s) || NO_EXEC.test(s)
// split top-level commas so loose mode can't mask invalid segments
const topLevelSplit = s => {
  const parts = []
  let depth = 0,
    cur = ''
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) {
      parts.push(cur)
      cur = ''
    } else cur += ch
  }
  parts.push(cur)
  return parts.map(p => p.trim()).filter(Boolean)
}
const mockSignal = { throwIfAborted: () => {} }
const makeQuery = () => {
  const graph = getSimpleGraph()
  return new Query({
    nodes: new Set(graph.nodes.values()),
    edges: graph.edges,
    importers: graph.importers,
    securityArchive: undefined,
  })
}

const parseAll = selectors => {
  const failures = []
  for (const s of selectors) {
    try {
      parse(s)
    } catch (err) {
      failures.push(`${s} → ${err.message}`)
    }
  }
  return failures
}

const execAll = async selectors => {
  const failures = []
  const skipped = []
  for (const s of selectors) {
    if (skipExec(s)) {
      skipped.push(s)
      continue
    }
    for (const seg of topLevelSplit(s)) {
      try {
        await makeQuery().search(seg, { signal: mockSignal })
      } catch (err) {
        failures.push(`${seg} → ${err.message}`)
      }
    }
  }
  return { failures, skipped }
}

// ---- per-eval assertion logic ----------------------------------------------
const first = (arr, re) => arr.find(s => re.test(s))
const preCodeText = text =>
  text.slice(0, Math.max(text.indexOf('```'), 0)).trim()

const graders = {
  0: async (text, sels) => {
    const hit = first(sels, /:root\s*>\s*\*?:outdated/)
    const parseFails = parseAll(sels)
    const { failures: execFails, skipped } = await execAll(sels)
    const pre = preCodeText(text)
    return [
      {
        text: 'proposes-root-outdated-selector',
        passed: !!hit,
        evidence: hit ?? `selectors: ${sels.join(' | ') || '(none)'}`,
      },
      {
        text: 'all-selectors-parse',
        passed: parseFails.length === 0,
        evidence:
          parseFails.join('; ') || `${sels.length} selectors parsed`,
      },
      {
        text: 'selector-executes-on-fixture-graph',
        passed: execFails.length === 0,
        evidence:
          execFails.join('; ') ||
          `executed ${sels.length - skipped.length}, skipped (network-dependent): ${skipped.length}`,
      },
      {
        text: 'query-first-style',
        passed: pre.length < 150,
        evidence:
          pre.length < 150 ?
            `only ${pre.length} chars before first code block`
          : `${pre.length} chars of preamble before first code block: "${pre.slice(0, 80)}..."`,
      },
      {
        text: 'mentions-view-flag',
        passed: /--view/.test(text),
        evidence:
          /--view/.test(text) ?
            `matched "${text.match(/--view\S*/)[0]}"`
          : 'no --view mention',
      },
      {
        text: 'offers-related-queries',
        passed: sels.length >= 2,
        evidence: `${sels.length} distinct selectors offered`,
      },
    ]
  },
  1: async (text, sels) => {
    const attr = first(sels, /\[license\^?=\s*['"]?MIT/i)
    const badPseudo = /:license\(\s*['"]?mit/i.test(text)
    const anchored = first(sels, /:workspace\s*>\s*:prod/)
    const parseFails = parseAll(sels)
    return [
      {
        text: 'uses-license-attribute-form',
        passed: !!attr,
        evidence:
          attr ?? `selectors: ${sels.join(' | ') || '(none)'}`,
      },
      {
        text: 'avoids-invalid-license-pseudo',
        passed: !badPseudo,
        evidence:
          badPseudo ?
            'answer proposes :license(mit), which throws "Expected a valid license kind"'
          : 'no :license(mit) present',
      },
      {
        text: 'workspace-prod-anchored',
        passed: !!anchored,
        evidence:
          anchored ?? `selectors: ${sels.join(' | ') || '(none)'}`,
      },
      {
        text: 'all-selectors-parse',
        passed: parseFails.length === 0,
        evidence:
          parseFails.join('; ') || `${sels.length} selectors parsed`,
      },
      {
        text: 'offers-related-queries',
        passed: sels.length >= 2,
        evidence: `${sels.length} distinct selectors offered`,
      },
    ]
  },
  2: async (text, sels) => {
    const inv = first(
      sels,
      /:has\(\s*>\s*(#react|\[name=react\])\s*\)/,
    )
    const correction =
      /(#react\s*>\s*\*|wrong way|opposite direction|points? the wrong|selects? react'?s (own )?dependenc)/i.test(
        text,
      ) && /dependenc/i.test(text)
    // the recommended (first extracted) selector must not be the wrong-direction one
    const firstSel = sels[0] ?? ''
    const wrongAsAnswer = /^#react\s*>\s*\*$/.test(firstSel)
    const parseFails = parseAll(sels)
    const evidenceLine =
      text
        .split('\n')
        .find(l => /wrong|opposite|dependenc/i.test(l)) ?? ''
    return [
      {
        text: 'uses-has-inversion',
        passed: !!inv,
        evidence: inv ?? `selectors: ${sels.join(' | ') || '(none)'}`,
      },
      {
        text: 'corrects-direction-mistake',
        passed: correction,
        evidence:
          evidenceLine.trim().slice(0, 160) ||
          'no direction-correction language found',
      },
      {
        text: 'does-not-present-wrong-selector-as-answer',
        passed: !wrongAsAnswer,
        evidence: `first recommended selector: ${firstSel || '(none)'}`,
      },
      {
        text: 'all-selectors-parse',
        passed: parseFails.length === 0,
        evidence:
          parseFails.join('; ') || `${sels.length} selectors parsed`,
      },
      {
        text: 'explains-combinator-rationale',
        passed:
          /point.{0,40}dependenc|dependent\s*(→|->|to)\s*dependenc|parent.{0,12}child/i.test(
            text,
          ),
        evidence: (
          text.split('\n').find(l => /point|parent|→|->/.test(l)) ??
          'no general direction rule stated'
        )
          .trim()
          .slice(0, 160),
      },
    ]
  },
  3: async text => {
    const checks = [
      ['covers-workspace-anchor', /workspace/i],
      ['covers-direct-prod-segment', null], // special: needs both
      ['covers-cve-segment', /cve/i],
      ['mentions-security-data-source', /socket|network/i],
    ]
    return checks.map(([name, re]) => {
      if (name === 'covers-direct-prod-segment') {
        const ok = /direct/i.test(text) && /prod/i.test(text)
        return {
          text: name,
          passed: ok,
          evidence:
            ok ?
              'mentions both "direct" and "prod"'
            : `direct:${/direct/i.test(text)} prod:${/prod/i.test(text)}`,
        }
      }
      const m = text.match(re)
      return {
        text: name,
        passed: !!m,
        evidence: m ? `matched "${m[0]}"` : `no match for ${re}`,
      }
    })
  },
  4: async (text, sels) => {
    const threat =
      /:malware/.test(text) &&
      /:squat|:obfuscated|:suspicious/.test(text)
    const parseFails = parseAll(sels)
    return [
      {
        text: 'uses-threat-selectors',
        passed: threat,
        evidence:
          threat ?
            `selectors: ${sels.join(' | ')}`
          : `malware:${/:malware/.test(text)} squat/obf/susp:${/:squat|:obfuscated|:suspicious/.test(text)}`,
      },
      {
        text: 'all-selectors-parse',
        passed: parseFails.length === 0,
        evidence:
          parseFails.join('; ') || `${sels.length} selectors parsed`,
      },
      {
        text: 'mentions-security-data-source',
        passed: /socket|network/i.test(text),
        evidence:
          text.match(/socket|network/i)?.[0] ??
          'no Socket/network mention',
      },
      {
        text: 'offers-related-queries',
        passed: sels.length >= 2,
        evidence: `${sels.length} distinct selectors offered`,
      },
    ]
  },
  5: async (text, sels) => {
    const cap =
      /:dev[^\s,']*:(shell|network)|:dev:is\([^)]*:(shell|network)/.test(
        text,
      )
    const both = /:shell/.test(text) && /:network/.test(text)
    const parseFails = parseAll(sels)
    return [
      {
        text: 'uses-capability-selectors',
        passed: cap,
        evidence:
          cap ?
            `selectors: ${sels.join(' | ')}`
          : `selectors: ${sels.join(' | ') || '(none)'}`,
      },
      {
        text: 'covers-both-capabilities',
        passed: both,
        evidence: `shell:${/:shell/.test(text)} network:${/:network/.test(text)}`,
      },
      {
        text: 'all-selectors-parse',
        passed: parseFails.length === 0,
        evidence:
          parseFails.join('; ') || `${sels.length} selectors parsed`,
      },
      {
        text: 'explains-capability-meaning',
        passed: /socket|static|capab|can\s/i.test(text),
        evidence:
          text.match(/socket|static|capab|can\s\S*/i)?.[0] ??
          'no capability explanation',
      },
    ]
  },
  6: async (text, sels) => {
    const sev =
      first(sels, /:sev(erity)?\(/) ??
      (/:sev(erity)?\(/.test(text) ?
        text.match(/:sev(erity)?\([^)]*\)/)[0]
      : undefined)
    const anchored = /:workspace\s*>\s*:prod/.test(text)
    const parseFails = parseAll(sels)
    return [
      {
        text: 'uses-severity-filter',
        passed: !!sev,
        evidence: sev ?? `selectors: ${sels.join(' | ') || '(none)'}`,
      },
      {
        text: 'anchors-workspace-prod',
        passed: anchored,
        evidence:
          anchored ?
            text.match(/:workspace\s*>\s*:prod\S*/)[0]
          : `selectors: ${sels.join(' | ') || '(none)'}`,
      },
      {
        text: 'all-selectors-parse',
        passed: parseFails.length === 0,
        evidence:
          parseFails.join('; ') || `${sels.length} selectors parsed`,
      },
      {
        text: 'mentions-security-data-source',
        passed: /socket|network/i.test(text),
        evidence:
          text.match(/socket|network/i)?.[0] ??
          'no Socket/network mention',
      },
    ]
  },
}

// ---- round-3 style assertions (Examples tail, docs deep links, concision) ---
const examplesHeading = text => ({
  text: 'uses-examples-heading',
  passed: /Examples:/.test(text) && !/Related:/.test(text),
  evidence: `Examples: ${/Examples:/.test(text)}, Related: ${/Related:/.test(text)}`,
})
const docsLink = re => text => ({
  text: 'ends-with-docs-link',
  passed: re.test(text),
  evidence: text.match(re)?.[0] ?? `no link matching ${re}`,
})
const conciseAnswer = max => text => {
  const lines = text.split('\n').filter(l => l.trim()).length
  return {
    text: 'concise-answer',
    passed: lines <= max,
    evidence: `${lines} non-empty lines (max ${max})`,
  }
}
const SELECTORS_DOC = /docs\.vlt\.io\/cli\/selectors/
const round3Extras = {
  0: [examplesHeading, docsLink(SELECTORS_DOC)],
  1: [
    examplesHeading,
    // license query: either the structural selectors page or the
    // license-compliance section is a correct deep link
    docsLink(
      /docs\.vlt\.io\/cli\/(selectors|security#license-compliance)/,
    ),
  ],
  2: [docsLink(SELECTORS_DOC)],
  3: [
    docsLink(/docs\.vlt\.io\/cli\/security#vulnerability-detection/),
  ],
  4: [docsLink(/docs\.vlt\.io\/cli\/security#malware-detection/)],
  5: [
    conciseAnswer(22),
    docsLink(
      /docs\.vlt\.io\/cli\/security#behavioral-security-risks/,
    ),
  ],
  6: [
    examplesHeading,
    docsLink(/docs\.vlt\.io\/cli\/security#vulnerability-detection/),
  ],
}

// ---- run --------------------------------------------------------------------
for (const evalDir of readdirSync(iterDir).filter(d =>
  d.startsWith('eval-'),
)) {
  const id = Number(evalDir.match(/^eval-(\d+)/)[1])
  const variants = readdirSync(join(iterDir, evalDir), {
    withFileTypes: true,
  })
    .filter(d => d.isDirectory())
    .map(d => d.name)
  for (const variant of variants) {
    const answerPath = join(
      iterDir,
      evalDir,
      variant,
      'run-1',
      'outputs',
      'answer.md',
    )
    if (!existsSync(answerPath)) continue
    const text = readFileSync(answerPath, 'utf8')
    const sels = extractSelectors(text)
    const expectations = [
      ...(await graders[id](text, sels)),
      ...(round3Extras[id] ?? []).map(fn => fn(text)),
    ]
    const passed = expectations.filter(e => e.passed).length
    writeFileSync(
      join(iterDir, evalDir, variant, 'run-1', 'grading.json'),
      JSON.stringify(
        {
          summary: {
            total: expectations.length,
            passed,
            pass_rate: passed / expectations.length,
          },
          expectations,
        },
        null,
        2,
      ) + '\n',
    )
    console.log(
      `${evalDir}/${variant}: ${passed}/${expectations.length}`,
    )
  }
}
