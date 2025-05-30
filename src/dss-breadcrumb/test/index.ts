import t from 'tap'
import { getBreadcrumb } from '../src/index.ts'

t.test('getBreadcrumb', async t => {
  await t.test('valid cases', async t => {
    // Test the error cases properly since the function is designed to throw for most queries

    // Empty query should throw as expected
    t.throws(
      () => getBreadcrumb(''),
      /Failed to parse query/,
      'should throw on empty query',
    )

    // Simple ID selector - one of the few valid cases
    const idBreadcrumb = getBreadcrumb('#a')
    t.equal(
      idBreadcrumb.current.value,
      'a', // Note: The # prefix is not included in the value
      'should parse ID selector without # prefix',
    )
    t.equal(
      idBreadcrumb.current.type,
      'id',
      'should have type "id" for ID selector',
    )
    t.equal(
      idBreadcrumb.current.importer,
      false,
      'ID selector should have importer=false',
    )
    t.equal(
      idBreadcrumb.next(),
      undefined,
      'ID selector should have no next item',
    )
    t.equal(
      idBreadcrumb.prev(),
      undefined,
      'ID selector should have no prev item',
    )

    // Test :root pseudo selector (should have importer=true)
    const rootBreadcrumb = getBreadcrumb(':root')
    t.equal(
      rootBreadcrumb.current.value,
      ':root',
      'should parse :root pseudo selector',
    )
    t.equal(
      rootBreadcrumb.current.type,
      'pseudo',
      'should have type "pseudo" for :root',
    )
    t.equal(
      rootBreadcrumb.current.importer,
      true,
      ':root should have importer=true',
    )

    // Test :workspace pseudo selector (should have importer=true)
    const workspaceBreadcrumb = getBreadcrumb(':workspace')
    t.equal(
      workspaceBreadcrumb.current.value,
      ':workspace',
      'should parse :workspace pseudo selector',
    )
    t.equal(
      workspaceBreadcrumb.current.importer,
      true,
      ':workspace should have importer=true',
    )

    // Test :project pseudo selector (should have importer=true)
    const projectBreadcrumb = getBreadcrumb(':project')
    t.equal(
      projectBreadcrumb.current.value,
      ':project',
      'should parse :project pseudo selector',
    )
    t.equal(
      projectBreadcrumb.current.importer,
      true,
      ':project should have importer=true',
    )
    t.equal(
      projectBreadcrumb.current.type,
      'pseudo',
      ':project should have type=pseudo',
    )

    // Test with comment
    const commentBreadcrumb = getBreadcrumb('/* test comment */ #a')
    t.equal(
      commentBreadcrumb.comment,
      'test comment',
      'should extract full comment with delimiters',
    )
    t.equal(
      commentBreadcrumb.current.value,
      'a', // Without # prefix
      'should parse ID selector after comment',
    )
    t.equal(
      commentBreadcrumb.current.importer,
      false,
      'ID selector after comment should have importer=false',
    )

    // Test complex query with multiple ID selectors
    const complexBreadcrumb = getBreadcrumb('#foo > #bar > #baz')
    t.equal(
      complexBreadcrumb.current.value,
      'foo',
      'should start with first ID selector',
    )
    t.equal(
      complexBreadcrumb.current.type,
      'id',
      'first item should have type "id"',
    )
    t.equal(
      complexBreadcrumb.current.importer,
      false,
      'ID selector should have importer=false',
    )

    // Navigate forward
    const firstNext = complexBreadcrumb.next()
    t.ok(firstNext, 'should have a next item')
    t.equal(
      complexBreadcrumb.current.value,
      'bar',
      'current should now be the second ID',
    )
    t.equal(
      complexBreadcrumb.current.type,
      'id',
      'second item should have type "id"',
    )
    t.equal(
      complexBreadcrumb.current.importer,
      false,
      'second ID selector should have importer=false',
    )

    const secondNext = complexBreadcrumb.next()
    t.ok(secondNext, 'should have a second next item')
    t.equal(
      complexBreadcrumb.current.value,
      'baz',
      'current should now be the third ID',
    )
    t.equal(
      complexBreadcrumb.current.type,
      'id',
      'third item should have type "id"',
    )
    t.equal(
      complexBreadcrumb.current.importer,
      false,
      'third ID selector should have importer=false',
    )

    t.equal(
      complexBreadcrumb.next(),
      undefined,
      'should have no more next items',
    )

    // Navigate backward
    const firstPrev = complexBreadcrumb.prev()
    t.ok(firstPrev, 'should have a previous item')
    t.equal(
      complexBreadcrumb.current.value,
      'bar',
      'current should go back to the second ID',
    )

    const secondPrev = complexBreadcrumb.prev()
    t.ok(secondPrev, 'should have a second previous item')
    t.equal(
      complexBreadcrumb.current.value,
      'foo',
      'current should go back to the first ID',
    )

    t.equal(
      complexBreadcrumb.prev(),
      undefined,
      'should have no more previous items',
    )

    // Test workspace+ID consolidation (workspace first)
    const workspaceIdBreadcrumb = getBreadcrumb(
      ':workspace#a > #foo > #bar',
    )
    t.equal(
      workspaceIdBreadcrumb.current.value,
      ':workspace#a',
      'should consolidate :workspace and ID into a single item',
    )
    t.equal(
      workspaceIdBreadcrumb.current.type,
      'pseudo',
      'consolidated item should maintain pseudo type',
    )
    t.equal(
      workspaceIdBreadcrumb.current.importer,
      true,
      'consolidated :workspace#id should have importer=true',
    )

    // Test ID+workspace consolidation (ID first)
    const idWorkspaceBreadcrumb = getBreadcrumb(
      '#a:workspace > #foo > #bar',
    )
    t.equal(
      idWorkspaceBreadcrumb.current.value,
      'a:workspace',
      'should consolidate ID and :workspace into a single item',
    )
    t.equal(
      idWorkspaceBreadcrumb.current.type,
      'id',
      'consolidated item should maintain ID type',
    )
    t.equal(
      idWorkspaceBreadcrumb.current.importer,
      true,
      'consolidated id:workspace should have importer=true',
    )
    const nextWorkspaceBreadcrumb = idWorkspaceBreadcrumb.next()
    t.ok(nextWorkspaceBreadcrumb, 'should have a second next item')
    t.equal(
      idWorkspaceBreadcrumb.current.value,
      'foo',
      'current should now point to #foo',
    )
    t.equal(
      idWorkspaceBreadcrumb.current.type,
      'id',
      '#foo should have type "id"',
    )
    t.equal(
      idWorkspaceBreadcrumb.current.importer,
      false,
      '#foo should have importer=false',
    )

    // Test project+ID consolidation (project first)
    const projectIdBreadcrumb = getBreadcrumb(
      ':project#b > #foo > #bar',
    )
    t.equal(
      projectIdBreadcrumb.current.value,
      ':project#b',
      'should consolidate :project and ID into a single item',
    )
    t.equal(
      projectIdBreadcrumb.current.type,
      'pseudo',
      'consolidated item should maintain pseudo type',
    )
    t.equal(
      projectIdBreadcrumb.current.importer,
      true,
      'consolidated :project#id should have importer=true',
    )

    // Test ID+project consolidation (ID first)
    const idProjectBreadcrumb = getBreadcrumb(
      '#b:project > #foo > #bar',
    )
    t.equal(
      idProjectBreadcrumb.current.value,
      'b:project',
      'should consolidate ID and :project into a single item',
    )
    t.equal(
      idProjectBreadcrumb.current.type,
      'id',
      'consolidated item should maintain ID type',
    )
    t.equal(
      idProjectBreadcrumb.current.importer,
      true,
      'consolidated id:project should have importer=true',
    )
  })

  await t.test('error cases', async t => {
    // Now only test selectors that should still throw "Invalid query"
    t.throws(
      () => getBreadcrumb(':foo'),
      /Invalid query/,
      'should throw on invalid pseudo selector',
    )

    t.throws(
      () => getBreadcrumb('[name=foo]'),
      /Invalid query/,
      'should throw on attribute selector',
    )

    t.throws(
      () => getBreadcrumb(':root:prod'),
      /Invalid query/,
      'should throw on non-allowed pseudo selector',
    )

    t.throws(
      () => getBreadcrumb(':has(#a)'),
      /Invalid query/,
      'should throw on nested selector',
    )
  })

  await t.test('clear method', async t => {
    // One of the few valid cases is a simple ID selector
    const breadcrumb = getBreadcrumb('#a')
    t.equal(
      breadcrumb.current.value,
      'a', // Without # prefix
      'first item should be ID selector without # prefix',
    )

    breadcrumb.clear()
    // After clear, the items array should be empty but we can't directly check it
    // Check if iterating gives no items
    const items = [...breadcrumb]
    t.equal(items.length, 0, 'should have cleared all items')
  })
})
