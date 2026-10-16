import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import type { NormalizedManifest } from '@vltpkg/types'
import t from 'tap'
import { Graph } from '../../src/graph.ts'
import {
  fieldSkills,
  parseSkillsField,
} from '../../src/skills/field.ts'

t.test('parseSkillsField', async t => {
  const f = 'package.json "skills": '
  t.strictSame(parseSkillsField(undefined, 'package.json'), {
    npm: [],
    notes: [],
  })
  for (const v of ['npm:foo', {}, null]) {
    t.strictSame(
      parseSkillsField(v, 'package.json'),
      { npm: [], notes: [`${f}must be an array`] },
      JSON.stringify(v),
    )
  }
  const res = parseSkillsField(
    [
      'npm:foo',
      'npm:@s/x',
      { source: 'npm:bar', skills: ['a', 'B*'] },
      { source: 'npm:baz', skills: [] },
      { source: 'npm:q', ref: 'v1' },
      'npm:',
      '',
      './x',
      '../x',
      '..',
      '/x',
      '~x',
      'C:\\x',
      'o/r',
      'o/r@x',
      'https://github.com/o/r',
      'git@github.com:o/r.git',
      { source: 'o/r', skills: ['a'], ref: 'v1' },
      42,
      null,
      { skills: ['a'] },
      { source: 'npm:a', skills: [1] },
      { source: 'npm:a', skills: 'a' },
      { source: 'npm:a', ref: 1 },
      'o/r\nx',
    ],
    'package.json',
  )
  t.strictSame(res.npm, [
    { name: 'foo' },
    { name: '@s/x' },
    { name: 'bar', skills: ['a', 'B*'] },
    { name: 'baz' },
  ])
  t.strictSame(
    res.notes,
    [
      `"npm:q" can't have a "ref"`,
      'invalid entry "npm:"',
      'invalid entry ""',
      '"./x" not linked, local paths are not allowed',
      '"../x" not linked, local paths are not allowed',
      '".." not linked, local paths are not allowed',
      '"/x" not linked, local paths are not allowed',
      '"~x" not linked, local paths are not allowed',
      '"C:\\\\x" not linked, local paths are not allowed',
      '"o/r" not linked, only npm: sources are supported',
      '"o/r@x" not linked, only npm: sources are supported',
      '"https://github.com/o/r" not linked, only npm: sources are supported',
      '"git@github.com:o/r.git" not linked, only npm: sources are supported',
      '"o/r" not linked, only npm: sources are supported',
      'invalid entry 42',
      'invalid entry null',
      'invalid entry {"skills":["a"]}',
      'invalid entry {"source":"npm:a","skills":[1]}',
      'invalid entry {"source":"npm:a","skills":"a"}',
      'invalid entry {"source":"npm:a","ref":1}',
      '"o/r\\nx" not linked, only npm: sources are supported',
    ].map(n => f + n),
  )
})

t.test('fieldSkills', async t => {
  const reg = (spec: string) => joinDepIDTuple(['registry', '', spec])
  const setup = (rootSkills?: unknown, wsSkills?: unknown) => {
    const graph = new Graph({
      projectRoot: t.testdirName,
      mainManifest: {
        name: 'proj',
        version: '1.0.0',
        ...(rootSkills !== undefined && { skills: rootSkills }),
      },
    })
    const add = (
      from: (typeof graph)['mainImporter'],
      name: string,
      manifest = true,
    ) =>
      graph.placePackage(
        from,
        'prod',
        Spec.parse(`${name}@1.0.0`),
        manifest ? { name, version: '1.0.0' } : undefined,
      )
    add(graph.mainImporter, 'foo')
    add(graph.mainImporter, 'missing', false)
    const ws = graph.addNode(
      joinDepIDTuple(['workspace', 'packages/a']),
      wsSkills === undefined ? undefined : (
        ({
          name: 'a',
          version: '1.0.0',
          skills: wsSkills,
        } as NormalizedManifest)
      ),
    )
    ws.setImporterLocation('./packages/a')
    graph.importers.add(ws)
    add(ws, 'bar')
    return { graph, ws }
  }
  const ids = (...l: DepID[]) => new Set(l)
  const root = joinDepIDTuple(['file', '.'])
  const field = [
    { source: 'npm:foo', skills: ['a', 'b*'] },
    'npm:foo',
    'npm:missing',
    'npm:nope',
    'o/r',
  ]

  const { graph, ws } = setup(field, ['npm:bar', 'npm:foo'])
  t.strictSame(
    fieldSkills(graph, ids(reg('foo@1.0.0')), false),
    { parts: [], notes: [] },
    'importer not selected',
  )
  t.strictSame(fieldSkills(graph, ids(root), false), {
    parts: [
      { ids: ids(reg('foo@1.0.0')), patterns: ['a', 'b*'] },
      { ids: ids(reg('foo@1.0.0')) },
    ],
    notes: [
      'package.json "skills": "npm:missing" not linked, not an installed dependency',
      'package.json "skills": "npm:nope" not linked, not an installed dependency',
      'package.json "skills": "o/r" not linked, only npm: sources are supported',
    ],
  })
  t.strictSame(
    fieldSkills(graph, ids(ws.id), false),
    {
      parts: [{ ids: ids(reg('bar@1.0.0')) }],
      notes: [
        'packages/a/package.json "skills": "npm:foo" not linked, not an installed dependency',
      ],
    },
    'workspace: own deps only',
  )

  t.test('secure: deps must be selected', async t => {
    const res = fieldSkills(graph, ids(root), true)
    t.strictSame(res.parts, [])
    t.strictSame(
      res.notes.filter(n => n.includes('npm:foo')),
      [
        'package.json "skills": "npm:foo" not linked, not selected by the query',
        'package.json "skills": "npm:foo" not linked, not selected by the query',
      ],
    )
    t.strictSame(
      fieldSkills(graph, ids(root, reg('foo@1.0.0')), true).parts,
      [
        { ids: ids(reg('foo@1.0.0')), patterns: ['a', 'b*'] },
        { ids: ids(reg('foo@1.0.0')) },
      ],
    )
  })

  t.test('no field, no manifest', async t => {
    const { graph, ws } = setup()
    t.strictSame(fieldSkills(graph, ids(root, ws.id), false), {
      parts: [],
      notes: [],
    })
  })
})
