import { test } from 'tap'
import { join, resolve } from 'node:path'
import { mkdtemp, writeFile, mkdir, symlink, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { skills } from '../src/skills.ts'
import { load as actualLoad } from '../src/actual/load.ts'
import type { Graph } from '../src/graph.ts'
import { Node } from '../src/node.ts'
import { PackageJson } from '@vltpkg/package-json'
import { PackageInfoClient } from '@vltpkg/package-info'
import { PathScurry } from 'path-scurry'

// Mock dependencies for testing
const mockNode = (name: string, packagePath: string): Node => {
  const node = new Node({
    id: `${name}@1.0.0`,
    location: packagePath,
    graph: {} as Graph,
    projectRoot: '/test',
  })
  ;(node as any).name = name
  ;(node as any).isProjectRoot = () => false
  ;(node as any).isWorkspace = () => false
  ;(node as any).resolvedLocation = () => packagePath
  return node
}

const mockGraph = (nodes: Node[]): Graph => {
  const graph = {} as Graph
  graph.nodes = new Map(nodes.map(node => [node.id, node]))
  graph.edges = new Map()
  graph.importers = new Map()
  return graph
}

test('skills discovery', async t => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'vlt-skills-test-'))
  
  t.test('discover skill files', async t => {
    // Create test package with skill files
    const pkgDir = join(tmpDir, 'test-package')
    await mkdir(pkgDir, { recursive: true })
    await writeFile(join(pkgDir, 'skills.md'), '# Test skill')
    await writeFile(join(pkgDir, 'SKILL.md'), '# Another skill')
    await writeFile(join(pkgDir, 'custom.skill.md'), '# Custom skill')
    await writeFile(join(pkgDir, 'package.json'), '{"name": "test-package"}')
    await writeFile(join(pkgDir, 'README.md'), '# Not a skill')

    const node = mockNode('test-package', pkgDir)
    const graph = mockGraph([node])

    // Mock the actualLoad function
    const originalLoad = actualLoad
    ;(global as any).actualLoad = () => graph

    try {
      const result = await skills({
        action: 'list',
        target: '*',
        projectRoot: tmpDir,
        scurry: new PathScurry(tmpDir),
        packageJson: new PackageJson(),
        packageInfo: new PackageInfoClient({ registry: '' }),
      })

      t.equal(result.action, 'list')
      t.equal(result.discovered.length, 1)
      t.equal(result.discovered[0].packageName, 'test-package')
      t.equal(result.discovered[0].files.length, 3)
      t.ok(result.discovered[0].files.includes('skills.md'))
      t.ok(result.discovered[0].files.includes('SKILL.md'))
      t.ok(result.discovered[0].files.includes('custom.skill.md'))
      t.notOk(result.discovered[0].files.includes('README.md'))
    } finally {
      ;(global as any).actualLoad = originalLoad
    }
  })

  t.test('link skills', async t => {
    // Create test package with skill file
    const pkgDir = join(tmpDir, 'linkable-package')
    await mkdir(pkgDir, { recursive: true })
    await writeFile(join(pkgDir, 'skills.md'), '# Linkable skill')

    const node = mockNode('linkable-package', pkgDir)
    const graph = mockGraph([node])

    // Mock the actualLoad function
    const originalLoad = actualLoad
    ;(global as any).actualLoad = () => graph

    try {
      const result = await skills({
        action: 'link',
        target: '*',
        projectRoot: tmpDir,
        scurry: new PathScurry(tmpDir),
        packageJson: new PackageJson(),
        packageInfo: new PackageInfoClient({ registry: '' }),
      })

      t.equal(result.action, 'link')
      t.equal(result.linked.length, 1)
      t.equal(result.linked[0].packageName, 'linkable-package')

      // Check that the skill was linked
      const skillLink = join(tmpDir, 'skills', 'linkable-package', 'skills.md')
      t.ok(existsSync(skillLink), 'Skills symlink should exist')
    } finally {
      ;(global as any).actualLoad = originalLoad
    }
  })

  t.test('unlink skills', async t => {
    // Create a skill link first
    const skillsDir = join(tmpDir, 'skills', 'unlinkable-package')
    await mkdir(skillsDir, { recursive: true })
    const pkgDir = join(tmpDir, 'unlinkable-package')
    await mkdir(pkgDir, { recursive: true })
    await writeFile(join(pkgDir, 'skills.md'), '# Unlinkable skill')
    
    const linkPath = join(skillsDir, 'skills.md')
    await symlink(join(pkgDir, 'skills.md'), linkPath)

    const node = mockNode('unlinkable-package', pkgDir)
    const graph = mockGraph([node])

    // Mock the actualLoad function
    const originalLoad = actualLoad
    ;(global as any).actualLoad = () => graph

    try {
      const result = await skills({
        action: 'unlink',
        target: '*',
        projectRoot: tmpDir,
        scurry: new PathScurry(tmpDir),
        packageJson: new PackageJson(),
        packageInfo: new PackageInfoClient({ registry: '' }),
      })

      t.equal(result.action, 'unlink')
      t.equal(result.unlinked.length, 1)
      t.equal(result.unlinked[0].packageName, 'unlinkable-package')

      // Check that the skill was unlinked
      t.notOk(existsSync(linkPath), 'Skills symlink should be removed')
    } finally {
      ;(global as any).actualLoad = originalLoad
    }
  })

  t.test('filter by target query', async t => {
    // This would need more sophisticated mocking to test query filtering
    // For now, just test that the function doesn't crash with different targets
    const pkgDir = join(tmpDir, 'filtered-package')
    await mkdir(pkgDir, { recursive: true })
    await writeFile(join(pkgDir, 'skills.md'), '# Filtered skill')

    const node = mockNode('filtered-package', pkgDir)
    const graph = mockGraph([node])

    const originalLoad = actualLoad
    ;(global as any).actualLoad = () => graph

    try {
      const result = await skills({
        action: 'list',
        target: ':not(*)',
        projectRoot: tmpDir,
        scurry: new PathScurry(tmpDir),
        packageJson: new PackageJson(),
        packageInfo: new PackageInfoClient({ registry: '' }),
      })

      t.equal(result.action, 'list')
      t.equal(result.discovered.length, 0, 'Should discover no skills with :not(*) target')
    } finally {
      ;(global as any).actualLoad = originalLoad
    }
  })
})