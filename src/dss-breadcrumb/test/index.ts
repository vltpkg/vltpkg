import t from 'tap'
import {
  parseBreadcrumb,
  InteractiveBreadcrumb,
} from '../src/index.ts'

t.test('Breadcrumb', async t => {
  await t.test('parseBreadcrumb', async t => {
    // Test the error cases properly since the function is designed to throw for most queries

    // Empty query should throw as expected
    t.throws(
      () => parseBreadcrumb(''),
      /Failed to parse query/,
      'should throw on empty query',
    )

    // Test comments extraction
    const commentBreadcrumb = parseBreadcrumb('/* test comment */ #a')
    t.equal(
      commentBreadcrumb.comment,
      'test comment',
      'should extract full comment with delimiters',
    )
  })

  await t.test('error cases', async t => {
    // Test selectors that should throw "Invalid query"
    t.throws(
      () => parseBreadcrumb(':foo'),
      /Invalid query/,
      'should throw on invalid pseudo selector',
    )

    t.throws(
      () => parseBreadcrumb('[name=foo]'),
      /Invalid query/,
      'should throw on attribute selector',
    )

    t.throws(
      () => parseBreadcrumb(':root:prod'),
      /Invalid query/,
      'should throw on non-allowed pseudo selector',
    )

    t.throws(
      () => parseBreadcrumb(':has(#a)'),
      /Invalid query/,
      'should throw on nested selector',
    )
  })

  await t.test('first getter', async t => {
    // Simple ID selector
    const idBreadcrumb = parseBreadcrumb('#a')
    t.equal(
      idBreadcrumb.first.value,
      '#a',
      'should retrieve the first item in the breadcrumb',
    )
    t.equal(
      idBreadcrumb.first.type,
      'id',
      'first item should have type "id"',
    )
    t.equal(
      idBreadcrumb.first.importer,
      false,
      'ID selector should have importer=false',
    )
    t.equal(
      idBreadcrumb.first.name,
      'a',
      'first item should have name "a"',
    )

    // Root pseudo selector
    const rootBreadcrumb = parseBreadcrumb(':root')
    t.equal(
      rootBreadcrumb.first.value,
      ':root',
      'should retrieve the first item in the breadcrumb',
    )
    t.equal(
      rootBreadcrumb.first.type,
      'pseudo',
      'first item should have type "pseudo"',
    )
    t.equal(
      rootBreadcrumb.first.importer,
      true,
      ':root should have importer=true',
    )
  })

  await t.test('last getter', async t => {
    // Simple breadcrumb with one item
    const idBreadcrumb = parseBreadcrumb('#a')
    t.equal(
      idBreadcrumb.last.value,
      '#a',
      'last should equal first for single item breadcrumb',
    )

    // Complex breadcrumb with multiple items
    const complexBreadcrumb = parseBreadcrumb('#foo > #bar > #baz')
    t.equal(
      complexBreadcrumb.last.value,
      '#baz',
      'should retrieve the last item in the breadcrumb',
    )
    t.equal(
      complexBreadcrumb.last.type,
      'id',
      'last item should have type "id"',
    )
    t.equal(
      complexBreadcrumb.last.importer,
      false,
      'last ID selector should have importer=false',
    )
    t.equal(
      complexBreadcrumb.last.name,
      'baz',
      'last item should have name "baz"',
    )
  })

  await t.test('first/last getters on empty breadcrumb', async t => {
    // Create a breadcrumb
    const breadcrumb = parseBreadcrumb('#a')

    // Clear the breadcrumb to make it empty
    breadcrumb.clear()

    // Verify it's empty
    const items = [...breadcrumb]
    t.equal(items.length, 0, 'breadcrumb should be empty')

    // Accessing first on empty breadcrumb should throw
    t.throws(
      () => breadcrumb.first,
      /Failed to find first breadcrumb item/,
      'first getter should throw on empty breadcrumb',
    )

    // Accessing last on empty breadcrumb should throw
    t.throws(
      () => breadcrumb.last,
      /Failed to find first breadcrumb item/,
      'last getter should throw on empty breadcrumb',
    )
  })

  await t.test('single getter', async t => {
    // Single item breadcrumb
    const singleBreadcrumb = parseBreadcrumb('#a')
    t.equal(
      singleBreadcrumb.single,
      true,
      'single should be true for breadcrumb with one item',
    )

    // Multiple items breadcrumb
    const multipleBreadcrumb = parseBreadcrumb('#a > #b')
    t.equal(
      multipleBreadcrumb.single,
      false,
      'single should be false for breadcrumb with multiple items',
    )
  })

  await t.test('clear method', async t => {
    // Create a breadcrumb
    const breadcrumb = parseBreadcrumb('#a > #b > #c')

    // Verify it has items before clearing
    const beforeItems = [...breadcrumb]
    t.equal(
      beforeItems.length,
      3,
      'should have 3 items before clearing',
    )

    // Clear the breadcrumb
    breadcrumb.clear()

    // After clear, the items array should be empty
    const afterItems = [...breadcrumb]
    t.equal(afterItems.length, 0, 'should have cleared all items')
  })

  await t.test('special consolidated selectors', async t => {
    // Test workspace+ID consolidation (workspace first)
    const workspaceIdBreadcrumb = parseBreadcrumb(
      ':workspace#a > #foo > #bar',
    )
    t.equal(
      workspaceIdBreadcrumb.first.value,
      ':workspace#a',
      'should consolidate :workspace and ID into a single item',
    )
    t.equal(
      workspaceIdBreadcrumb.first.type,
      'pseudo',
      'consolidated item should maintain pseudo type',
    )
    t.equal(
      workspaceIdBreadcrumb.first.importer,
      true,
      'consolidated :workspace#id should have importer=true',
    )
    t.equal(
      workspaceIdBreadcrumb.first.name,
      'a',
      'consolidated :workspace#id should have name="a"',
    )

    // Test project+ID consolidation
    const projectIdBreadcrumb = parseBreadcrumb(
      ':project#a > #foo > #bar',
    )
    t.equal(
      projectIdBreadcrumb.first.value,
      ':project#a',
      'should consolidate :project and ID into a single item',
    )
    t.equal(
      projectIdBreadcrumb.first.type,
      'pseudo',
      'consolidated item should maintain pseudo type',
    )
    t.equal(
      projectIdBreadcrumb.first.importer,
      true,
      'consolidated :project#id should have importer=true',
    )
    t.equal(
      projectIdBreadcrumb.first.name,
      'a',
      'consolidated :project#id should have name="a"',
    )

    // Test ID+workspace consolidation (ID first)
    const idWorkspaceBreadcrumb = parseBreadcrumb(
      '#a:workspace > #foo > #bar',
    )
    t.equal(
      idWorkspaceBreadcrumb.first.value,
      '#a:workspace',
      'should consolidate ID and :workspace into a single item',
    )
    t.equal(
      idWorkspaceBreadcrumb.first.type,
      'id',
      'consolidated item should maintain ID type',
    )
    t.equal(
      idWorkspaceBreadcrumb.first.importer,
      true,
      'consolidated id:workspace should have importer=true',
    )
  })

  await t.test('iterator', async t => {
    // Test iterating through breadcrumb items
    const breadcrumb = parseBreadcrumb('#a > #b > #c')
    const items = [...breadcrumb]

    t.equal(items.length, 3, 'should iterate through all items')
    t.equal(items[0]!.value, '#a', 'first item should be #a')
    t.equal(items[1]!.value, '#b', 'second item should be #b')
    t.equal(items[2]!.value, '#c', 'third item should be #c')
  })
})

t.test('InteractiveBreadcrumb', async t => {
  await t.test('interactive method and current getter', async t => {
    // Create a breadcrumb and get an interactive instance
    const breadcrumb = parseBreadcrumb('#a > #b > #c')
    const interactive = breadcrumb.interactive()

    t.ok(
      interactive instanceof InteractiveBreadcrumb,
      'should return an InteractiveBreadcrumb instance',
    )
    t.equal(
      interactive.current?.value,
      '#a',
      'current should initially point to first item',
    )
    t.equal(
      interactive.current?.type,
      'id',
      'current item should have correct type',
    )
    t.equal(
      interactive.current?.name,
      'a',
      'current item should have correct name',
    )
  })

  await t.test('next method', async t => {
    // Create a breadcrumb and get an interactive instance
    const breadcrumb = parseBreadcrumb('#a > #b > #c')
    const interactive = breadcrumb.interactive()

    // Initial state
    t.equal(
      interactive.current?.value,
      '#a',
      'should start at first item',
    )
    t.equal(interactive.done, false, 'done should be false initially')

    // Move to next
    interactive.next()
    t.equal(
      interactive.current?.value,
      '#b',
      'should move to second item',
    )
    t.equal(interactive.done, false, 'done should still be false')

    // Move to next
    interactive.next()
    t.equal(
      interactive.current?.value,
      '#c',
      'should move to third item',
    )
    t.equal(interactive.done, false, 'done should still be false')

    // Move beyond the end
    interactive.next()
    t.equal(
      interactive.current,
      undefined,
      'current should be undefined after the end',
    )
    t.equal(interactive.done, true, 'done should be true at the end')

    // Move beyond the end again
    interactive.next()
    t.equal(
      interactive.current,
      undefined,
      'current should remain undefined',
    )
    t.equal(interactive.done, true, 'done should remain true')
  })

  await t.test('method chaining', async t => {
    // Test method chaining with next()
    const breadcrumb = parseBreadcrumb('#a > #b > #c')
    const interactive = breadcrumb.interactive()

    // Chain next() calls
    const result = interactive.next().next()
    t.equal(
      result,
      interactive,
      'next() should return the instance for chaining',
    )
    t.equal(
      interactive.current?.value,
      '#c',
      'should have moved to third item after chaining',
    )
  })
})

t.test('linked list navigation', async t => {
  // Test that the doubly-linked list is properly connected
  const breadcrumb = parseBreadcrumb('#a > #b > #c')
  const [first, second, third] = [...breadcrumb]

  // Forward navigation
  t.equal(first!.next, second, 'first.next should point to second')
  t.equal(second!.next, third, 'second.next should point to third')
  t.equal(third!.next, undefined, 'third.next should be undefined')

  // Backward navigation
  t.equal(third!.prev, second, 'third.prev should point to second')
  t.equal(second!.prev, first, 'second.prev should point to first')
  t.equal(first!.prev, undefined, 'first.prev should be undefined')
})
