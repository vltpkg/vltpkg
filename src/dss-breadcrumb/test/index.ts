import t from 'tap'
import {
  parseBreadcrumb,
  InteractiveBreadcrumb,
  specificitySort,
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
      () => parseBreadcrumb('[name=foo]'),
      /Invalid query/,
      'should throw on attribute selector',
    )

    t.throws(
      () => parseBreadcrumb(':root:prod'),
      /Invalid query/,
      'should throw on chained pseudo selectors',
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

  await t.test('pseudo selector support', async t => {
    // Test that any pseudo selector starting with : is now valid
    const fooBreadcrumb = parseBreadcrumb(':foo')
    t.equal(
      fooBreadcrumb.first.value,
      ':foo',
      'should accept :foo pseudo selector',
    )
    t.equal(
      fooBreadcrumb.first.type,
      'pseudo',
      ':foo should have type "pseudo"',
    )
    t.equal(
      fooBreadcrumb.first.importer,
      false,
      ':foo should have importer=false',
    )

    // Test other custom pseudo selectors
    const customPseudos = [
      ':custom',
      ':dev',
      ':prod',
      ':staging',
      ':test',
    ]
    for (const pseudo of customPseudos) {
      const breadcrumb = parseBreadcrumb(pseudo)
      t.equal(
        breadcrumb.first.value,
        pseudo,
        `should accept ${pseudo} pseudo selector`,
      )
      t.equal(
        breadcrumb.first.type,
        'pseudo',
        `${pseudo} should have type "pseudo"`,
      )
      t.equal(
        breadcrumb.first.importer,
        false,
        `${pseudo} should have importer=false`,
      )
    }

    // Test pseudo selectors in complex queries
    const complexPseudo = parseBreadcrumb(':custom > #a > #b')
    t.equal(
      complexPseudo.first.value,
      ':custom',
      'should handle :custom in complex query',
    )
    t.equal(
      complexPseudo.last.value,
      '#b',
      'should handle rest of complex query with custom pseudo',
    )

    // Test pseudo selector consolidation with custom pseudo
    const customIdBreadcrumb = parseBreadcrumb(':custom#a')
    t.equal(
      customIdBreadcrumb.first.value,
      ':custom#a',
      'should consolidate :custom and ID into a single item',
    )
    t.equal(
      customIdBreadcrumb.first.type,
      'pseudo',
      'consolidated custom pseudo item should maintain pseudo type',
    )
    t.equal(
      customIdBreadcrumb.first.importer,
      false,
      'consolidated :custom#id should have importer=false',
    )
    t.equal(
      customIdBreadcrumb.first.name,
      'a',
      'consolidated :custom#id should have name="a"',
    )

    // Test ID + custom pseudo consolidation
    const idCustomBreadcrumb = parseBreadcrumb('#a:custom')
    t.equal(
      idCustomBreadcrumb.first.value,
      '#a:custom',
      'should consolidate ID and :custom into a single item',
    )
    t.equal(
      idCustomBreadcrumb.first.type,
      'id',
      'consolidated item should maintain ID type',
    )
    t.equal(
      idCustomBreadcrumb.first.importer,
      false,
      'consolidated id:custom should have importer=false',
    )
    t.equal(
      idCustomBreadcrumb.first.name,
      'a',
      'consolidated id:custom should have name="a"',
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

  await t.test('specificity tracking', async t => {
    // Test simple ID selector
    const idBreadcrumb = parseBreadcrumb('#a')
    t.equal(
      idBreadcrumb.specificity.idCounter,
      1,
      'should count one ID selector',
    )
    t.equal(
      idBreadcrumb.specificity.commonCounter,
      0,
      'should count zero pseudo selectors',
    )

    // Test root selector
    const rootBreadcrumb = parseBreadcrumb(':root')
    t.equal(
      rootBreadcrumb.specificity.idCounter,
      0,
      'should count zero ID selectors',
    )
    t.equal(
      rootBreadcrumb.specificity.commonCounter,
      1,
      'should count one pseudo selector',
    )

    // Test complex selector with IDs and pseudos
    const complexBreadcrumb = parseBreadcrumb(
      ':root > #a > #b:workspace',
    )
    t.equal(
      complexBreadcrumb.specificity.idCounter,
      2,
      'should count two ID selectors',
    )
    t.equal(
      complexBreadcrumb.specificity.commonCounter,
      2,
      'should count two pseudo selectors (:root and :workspace)',
    )

    // Test consolidated selector (ID + workspace)
    const idWorkspaceBreadcrumb = parseBreadcrumb('#a:workspace')
    t.equal(
      idWorkspaceBreadcrumb.specificity.idCounter,
      1,
      'should count one ID selector in consolidated selector',
    )
    t.equal(
      idWorkspaceBreadcrumb.specificity.commonCounter,
      1,
      'should count one pseudo selector in consolidated selector',
    )

    // Test consolidated selector (workspace + ID)
    const workspaceIdBreadcrumb = parseBreadcrumb(':workspace#a')
    t.equal(
      workspaceIdBreadcrumb.specificity.idCounter,
      1,
      'should count one ID selector in consolidated selector',
    )
    t.equal(
      workspaceIdBreadcrumb.specificity.commonCounter,
      1,
      'should count one pseudo selector in consolidated selector',
    )

    // Test custom pseudo selector specificity
    const customBreadcrumb = parseBreadcrumb(':custom')
    t.equal(
      customBreadcrumb.specificity.idCounter,
      0,
      'should count zero ID selectors for custom pseudo',
    )
    t.equal(
      customBreadcrumb.specificity.commonCounter,
      1,
      'should count one pseudo selector for custom pseudo',
    )

    // Test complex custom pseudo selector
    const complexCustomBreadcrumb = parseBreadcrumb(
      ':custom > #a > #b:dev',
    )
    t.equal(
      complexCustomBreadcrumb.specificity.idCounter,
      2,
      'should count two ID selectors in complex custom query',
    )
    t.equal(
      complexCustomBreadcrumb.specificity.commonCounter,
      2,
      'should count two pseudo selectors (:custom and :dev) in complex query',
    )
  })
})

t.test('specificitySort', async t => {
  await t.test('sorts breadcrumbs by specificity', async t => {
    // Create test breadcrumbs with varying specificities
    const breadcrumb1 = parseBreadcrumb(':root > #a')
    const breadcrumb2 = parseBreadcrumb(':root > #b:workspace')
    const breadcrumb3 = parseBreadcrumb(':root > #a > #b > #c > #d')
    const breadcrumb4 = parseBreadcrumb('#a')
    const breadcrumb5 = parseBreadcrumb('#a > #b > #c')
    const breadcrumb6 = parseBreadcrumb('#a > #b:workspace > #c')

    // Mix them in a non-sorted order
    const unsorted = [
      breadcrumb1,
      breadcrumb2,
      breadcrumb3,
      breadcrumb4,
      breadcrumb5,
      breadcrumb6,
    ]

    // Sort them by specificity
    const sorted = specificitySort(unsorted)

    // Verify the sort order by checking specificities
    t.equal(
      sorted[0]!.specificity.idCounter,
      4,
      'First item should have highest idCounter',
    )
    t.equal(
      sorted[0],
      breadcrumb3,
      'First item should be breadcrumb3',
    )

    // The next items should have idCounter=3
    t.equal(
      sorted[1]!.specificity.idCounter,
      3,
      'Second item should have idCounter=3',
    )
    t.equal(
      sorted[2]!.specificity.idCounter,
      3,
      'Third item should have idCounter=3',
    )

    // Between the two with idCounter=3, the one with higher commonCounter should come first
    t.equal(
      sorted[1]!.specificity.commonCounter,
      1,
      'Second item should have commonCounter=1',
    )
    t.equal(
      sorted[2]!.specificity.commonCounter,
      0,
      'Third item should have commonCounter=0',
    )

    t.equal(
      sorted[1],
      breadcrumb6,
      'Second item should be breadcrumb6',
    )
    t.equal(
      sorted[2],
      breadcrumb5,
      'Third item should be breadcrumb5',
    )

    // The next item should be breadcrumb2 due to high commonCounter
    t.equal(
      sorted[3],
      breadcrumb2,
      'Fourth item should be breadcrumb2',
    )
    t.equal(
      sorted[3]!.specificity.idCounter,
      1,
      'Fourth item should have idCounter=1',
    )
    t.equal(
      sorted[3]!.specificity.commonCounter,
      2,
      'Fourth item should have commonCounter=2',
    )

    // Next should be breadcrumb1
    t.equal(
      sorted[4],
      breadcrumb1,
      'Fifth item should be breadcrumb1',
    )
    t.equal(
      sorted[4]!.specificity.idCounter,
      1,
      'Fifth item should have idCounter=1',
    )
    t.equal(
      sorted[4]!.specificity.commonCounter,
      1,
      'Fifth item should have commonCounter=1',
    )

    // Last should be breadcrumb4
    t.equal(
      sorted[5],
      breadcrumb4,
      'Sixth item should be breadcrumb4',
    )
    t.equal(
      sorted[5]!.specificity.idCounter,
      1,
      'Sixth item should have idCounter=1',
    )
    t.equal(
      sorted[5]!.specificity.commonCounter,
      0,
      'Sixth item should have commonCounter=0',
    )
  })

  await t.test(
    'preserves original order when specificities are equal',
    async t => {
      // Create breadcrumbs with identical specificities
      const breadcrumb1 = parseBreadcrumb('#a > #b')
      const breadcrumb2 = parseBreadcrumb('#c > #d')

      // Both have idCounter=2, commonCounter=0
      t.equal(
        breadcrumb1.specificity.idCounter,
        2,
        'first breadcrumb should have idCounter=2',
      )
      t.equal(
        breadcrumb2.specificity.idCounter,
        2,
        'second breadcrumb should have idCounter=2',
      )
      t.equal(
        breadcrumb1.specificity.commonCounter,
        0,
        'first breadcrumb should have commonCounter=0',
      )
      t.equal(
        breadcrumb2.specificity.commonCounter,
        0,
        'second breadcrumb should have commonCounter=0',
      )

      // Sort them
      const sorted1 = specificitySort([breadcrumb1, breadcrumb2])
      const sorted2 = specificitySort([breadcrumb2, breadcrumb1])

      // Original order should be preserved when specificities are equal
      t.equal(
        sorted1[0],
        breadcrumb1,
        'first element should be preserved',
      )
      t.equal(
        sorted1[1],
        breadcrumb2,
        'second element should be preserved',
      )
      t.equal(
        sorted2[0],
        breadcrumb2,
        'first element should be preserved in reverse order',
      )
      t.equal(
        sorted2[1],
        breadcrumb1,
        'second element should be preserved in reverse order',
      )
    },
  )
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
