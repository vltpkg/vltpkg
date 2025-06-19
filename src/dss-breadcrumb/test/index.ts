import t from 'tap'
import {
  parseBreadcrumb,
  InteractiveBreadcrumb,
  specificitySort,
  extractPseudoParameter,
  getPseudoSelectorFullText,
  removeQuotes,
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
      /Invalid pseudo selector/,
      'should throw on chained pseudo selectors',
    )

    // Test invalid pseudo selector (not in supported list)
    t.throws(
      () => parseBreadcrumb(':unknown'),
      /Invalid pseudo selector/,
      'should throw on unsupported pseudo selector',
    )

    // Test chained pseudo selectors during consolidation
    t.throws(
      () => parseBreadcrumb(':root:workspace'),
      /Invalid query/,
      'should throw on chained pseudo selectors during consolidation',
    )

    const semverBreadcrumb = parseBreadcrumb(':semver(1)')
    t.equal(
      semverBreadcrumb.first.value,
      ':semver(1)',
      'should accept :semver pseudo selector with parameter',
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
    // Test other custom pseudo selectors
    const customPseudos = [':semver', ':v']
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

    const complexPseudo = parseBreadcrumb(':project > #a > #b')
    t.equal(
      complexPseudo.first.value,
      ':project',
      'should handle :project in complex query',
    )
    t.equal(
      complexPseudo.last.value,
      '#b',
      'should handle rest of complex query with custom pseudo',
    )

    // Test pseudo selector consolidation with custom pseudo
    const customIdBreadcrumb = parseBreadcrumb(':project#a')
    t.equal(
      customIdBreadcrumb.first.value,
      ':project#a',
      'should consolidate :project and ID into a single item',
    )
    t.equal(
      customIdBreadcrumb.first.type,
      'pseudo',
      'consolidated project pseudo item should maintain pseudo type',
    )
    t.equal(
      customIdBreadcrumb.first.importer,
      true,
      'consolidated :project#id should have importer=true',
    )
    t.equal(
      customIdBreadcrumb.first.name,
      'a',
      'consolidated :project#id should have name="a"',
    )

    // Test ID + custom pseudo consolidation
    const idCustomBreadcrumb = parseBreadcrumb('#a:workspace')
    t.equal(
      idCustomBreadcrumb.first.value,
      '#a:workspace',
      'should consolidate ID and :workspace into a single item',
    )
    t.equal(
      idCustomBreadcrumb.first.type,
      'id',
      'consolidated item should maintain ID type',
    )
    t.equal(
      idCustomBreadcrumb.first.importer,
      true,
      'consolidated id:workspace should have importer=true',
    )
    t.equal(
      idCustomBreadcrumb.first.name,
      'a',
      'consolidated id:workspace should have name="a"',
    )
  })

  await t.test('semver selector support', async t => {
    // Test basic semver selector without parameters
    const semverBreadcrumb = parseBreadcrumb(':semver')
    t.equal(
      semverBreadcrumb.first.value,
      ':semver',
      'should accept :semver pseudo selector',
    )
    t.equal(
      semverBreadcrumb.first.type,
      'pseudo',
      ':semver should have type "pseudo"',
    )
    t.equal(
      semverBreadcrumb.first.importer,
      false,
      ':semver should have importer=false',
    )

    // Test :v alias
    const vBreadcrumb = parseBreadcrumb(':v')
    t.equal(
      vBreadcrumb.first.value,
      ':v',
      'should accept :v pseudo selector',
    )

    // Test semver comparator with no version provided
    t.equal(
      semverBreadcrumb.first.comparator({}),
      false,
      'comparator should return false when no version is provided',
    )

    // Test semver comparator without range parameter (should return false when no range)
    t.equal(
      semverBreadcrumb.first.comparator({ semver: '1.0.0' }),
      false,
      'comparator should return false when no range parameter is provided',
    )

    // Test comparator functionality
    const customBreadcrumb = parseBreadcrumb(':workspace')
    t.equal(
      customBreadcrumb.first.comparator({}),
      true,
      'non-semver selector comparator should return true',
    )
    t.equal(
      customBreadcrumb.first.comparator({ semver: '1.0.0' }),
      true,
      'non-semver selector comparator should return true even with version',
    )

    // Test semver selectors in complex queries
    const complexSemver = parseBreadcrumb(':semver > #a > #b')
    t.equal(
      complexSemver.first.value,
      ':semver',
      'should handle :semver in complex query',
    )
    t.equal(
      complexSemver.last.value,
      '#b',
      'should handle rest of complex query with semver',
    )

    // Test semver selector consolidation with ID
    const semverIdBreadcrumb = parseBreadcrumb(':semver#test')
    t.equal(
      semverIdBreadcrumb.first.value,
      ':semver#test',
      'should consolidate :semver and ID into a single item',
    )
    t.equal(
      semverIdBreadcrumb.first.type,
      'pseudo',
      'consolidated semver item should maintain pseudo type',
    )
    t.equal(
      semverIdBreadcrumb.first.importer,
      false,
      'consolidated :semver#id should have importer=false',
    )
    t.equal(
      semverIdBreadcrumb.first.name,
      'test',
      'consolidated :semver#id should have name="test"',
    )

    // Test ID + semver consolidation
    const idSemverBreadcrumb = parseBreadcrumb('#test:v')
    t.equal(
      idSemverBreadcrumb.first.value,
      '#test:v',
      'should consolidate ID and :v into a single item',
    )
    t.equal(
      idSemverBreadcrumb.first.type,
      'id',
      'consolidated item should maintain ID type',
    )
    t.equal(
      idSemverBreadcrumb.first.importer,
      false,
      'consolidated id:v should have importer=false',
    )
    t.equal(
      idSemverBreadcrumb.first.name,
      'test',
      'consolidated id:v should have name="test"',
    )

    // Test semver selectors with actual parameters
    await t.test('semver with range parameters', async t => {
      // Test case 1: #foo > #bar:semver(^1.0.0)
      const breadcrumb1 = parseBreadcrumb(
        '#foo > #bar:semver(^1.0.0)',
      )
      const lastItem1 = breadcrumb1.last

      t.equal(
        lastItem1.value,
        '#bar:semver(^1.0.0)',
        'should parse consolidated selector with semver parameter',
      )
      t.equal(
        lastItem1.type,
        'id',
        'consolidated item should maintain ID type',
      )
      t.equal(lastItem1.name, 'bar', 'should extract correct name')

      // Test comparator with versions that should match ^1.0.0
      t.equal(
        lastItem1.comparator({ semver: '1.0.0' }),
        true,
        'should match 1.0.0 for ^1.0.0 range',
      )
      t.equal(
        lastItem1.comparator({ semver: '1.2.3' }),
        true,
        'should match 1.2.3 for ^1.0.0 range',
      )
      t.equal(
        lastItem1.comparator({ semver: '2.0.0' }),
        false,
        'should not match 2.0.0 for ^1.0.0 range',
      )

      // Test case 2: :root > #foo:semver(">=2")
      const breadcrumb2 = parseBreadcrumb(
        ':root > #foo:semver(">=2")',
      )
      const lastItem2 = breadcrumb2.last

      t.equal(
        lastItem2.value,
        '#foo:semver(">=2")',
        'should parse quoted parameter',
      )
      t.equal(
        lastItem2.type,
        'id',
        'consolidated item should maintain ID type',
      )
      t.equal(lastItem2.name, 'foo', 'should extract correct name')

      // Test comparator with versions for >=2 range
      t.equal(
        lastItem2.comparator({ semver: '2.0.0' }),
        true,
        'should match 2.0.0 for >=2 range',
      )
      t.equal(
        lastItem2.comparator({ semver: '3.3.3' }),
        true,
        'should match 3.3.3 for >=2 range',
      )
      t.equal(
        lastItem2.comparator({ semver: '1.0.0' }),
        false,
        'should not match 1.0.0 for >=2 range',
      )

      // Test case 3: #bar:v(1) > #baz > #lorem:semver("~2.0.0")
      const breadcrumb3 = parseBreadcrumb(
        '#bar:v(1) > #baz > #lorem:semver("~2.0.0")',
      )
      const firstItem3 = breadcrumb3.first
      const lastItem3 = breadcrumb3.last

      // Test first item with :v(1)
      t.equal(
        firstItem3.value,
        '#bar:v(1)',
        'should parse :v selector with parameter',
      )
      t.equal(
        firstItem3.type,
        'id',
        'first item should maintain ID type',
      )
      t.equal(
        firstItem3.name,
        'bar',
        'should extract correct name from first item',
      )

      // Test comparator for first item with version 1
      t.equal(
        firstItem3.comparator({ semver: '1.0.0' }),
        true,
        'should match 1.0.0 for version 1',
      )
      t.equal(
        firstItem3.comparator({ semver: '1.2.3' }),
        true,
        'should match 1.2.3 for version 1',
      )
      t.equal(
        firstItem3.comparator({ semver: '2.0.0' }),
        false,
        'should not match 2.0.0 for version 1',
      )
      t.equal(
        firstItem3.comparator({ semver: '0.0.1' }),
        false,
        'should not match 0.0.1 for version 1',
      )

      // Test last item with :semver("~2.0.0")
      t.equal(
        lastItem3.value,
        '#lorem:semver("~2.0.0")',
        'should parse last item with quoted semver parameter',
      )
      t.equal(
        lastItem3.type,
        'id',
        'last item should maintain ID type',
      )
      t.equal(
        lastItem3.name,
        'lorem',
        'should extract correct name from last item',
      )

      // Test comparator for last item with ~2.0.0 range
      t.equal(
        lastItem3.comparator({ semver: '2.0.0' }),
        true,
        'should match 2.0.0 for ~2.0.0 range',
      )
      t.equal(
        lastItem3.comparator({ semver: '2.0.5' }),
        true,
        'should match 2.0.5 for ~2.0.0 range',
      )
      t.equal(
        lastItem3.comparator({ semver: '2.2.2' }),
        false,
        'should not match 2.2.2 for ~2.0.0 range (minor bump)',
      )
      t.equal(
        lastItem3.comparator({ semver: '1.0.0' }),
        false,
        'should not match 1.0.0 for ~2.0.0 range',
      )
      t.equal(
        lastItem3.comparator({ semver: '3.0.0' }),
        false,
        'should not match 3.0.0 for ~2.0.0 range',
      )

      // Test middle item (should have default comparator)
      const middleItem3 = [...breadcrumb3][1]
      t.equal(
        middleItem3!.value,
        '#baz',
        'middle item should be parsed correctly',
      )
      t.equal(
        middleItem3!.comparator({ semver: '1.0.0' }),
        true,
        'middle item should have default comparator returning true',
      )
    })

    // Test edge cases for semver parameters
    await t.test('semver parameter edge cases', async t => {
      // Test unquoted parameter
      const breadcrumb1 = parseBreadcrumb(':semver(>=1.0.0)')
      t.equal(
        breadcrumb1.first.value,
        ':semver(>=1.0.0)',
        'should handle unquoted parameter',
      )
      t.equal(
        breadcrumb1.first.comparator({ semver: '1.5.0' }),
        true,
        'should work with unquoted parameter',
      )
      t.equal(
        breadcrumb1.first.comparator({ semver: '0.9.0' }),
        false,
        'should correctly reject with unquoted parameter',
      )

      // Test parameter with spaces (quoted)
      const breadcrumb2 = parseBreadcrumb(':semver(" >= 2.0.0 ")')
      t.equal(
        breadcrumb2.first.value,
        ':semver(" >= 2.0.0 ")',
        'should handle parameter with spaces',
      )
      // should compare ranges correctly
      t.equal(
        breadcrumb2.first.comparator({ semver: '^2.1.0' }),
        true,
        'should work with spaced parameter',
      )

      // Test complex range
      const breadcrumb3 = parseBreadcrumb('#test:v("1.0.0 - 2.0.0")')
      t.equal(
        breadcrumb3.first.value,
        '#test:v("1.0.0 - 2.0.0")',
        'should handle range parameter',
      )
      t.equal(
        breadcrumb3.first.comparator({ semver: '1.5.0' }),
        true,
        'should match version in range',
      )
      t.equal(
        breadcrumb3.first.comparator({ semver: '2.5.0' }),
        false,
        'should not match version outside range',
      )
    })

    // Test chained semver selectors
    await t.test('chained semver selectors', async t => {
      // Test case: #bar:semver(">1"):semver("<=2.5.0")
      // This should match versions that are both >1 AND <=2.5.0
      const chainedBreadcrumb = parseBreadcrumb(
        '#bar:semver(">1"):semver("<=2.5.0")',
      )

      t.equal(
        chainedBreadcrumb.first.value,
        '#bar:semver(">1"):semver("<=2.5.0")',
        'should parse chained semver selectors correctly',
      )
      t.equal(
        chainedBreadcrumb.first.type,
        'id',
        'chained item should maintain ID type',
      )
      t.equal(
        chainedBreadcrumb.first.name,
        'bar',
        'chained item should have correct name',
      )

      // Test version combinations with AND logic
      t.equal(
        chainedBreadcrumb.first.comparator({ semver: '1.2.3' }),
        false,
        'should reject 1.2.3 (not > 1)',
      )
      t.equal(
        chainedBreadcrumb.first.comparator({ semver: '3.0.0' }),
        false,
        'should reject 3.0.0 (not <= 2.5.0)',
      )
      t.equal(
        chainedBreadcrumb.first.comparator({ semver: '2.0.0' }),
        true,
        'should accept 2.0.0 (> 1 AND <= 2.5.0)',
      )
      t.equal(
        chainedBreadcrumb.first.comparator({ semver: '2.4.9' }),
        true,
        'should accept 2.4.9 (> 1 AND <= 2.5.0)',
      )
      t.equal(
        chainedBreadcrumb.first.comparator({ semver: '2.6.0' }),
        false,
        'should reject 2.6.0 (not <= 2.5.0)',
      )

      // Test edge case: version exactly at boundary
      t.equal(
        chainedBreadcrumb.first.comparator({ semver: '1.0.0' }),
        false,
        'should reject 1.0.0 (not > 1)',
      )
      t.equal(
        chainedBreadcrumb.first.comparator({ semver: '2.5.0' }),
        true,
        'should accept 2.5.0 (> 1 AND <= 2.5.0)',
      )
    })
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
    const customBreadcrumb = parseBreadcrumb(':semver(*)')
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
      ':root > #a > #b:semver(1)',
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

    // Test edge cases for better coverage
    await t.test('edge cases for coverage', async t => {
      // Test combination of non-semver pseudo selector with ID - should use AND logic
      const combinedBreadcrumb = parseBreadcrumb(':project#test')
      const combinedComparator = combinedBreadcrumb.first.comparator
      t.equal(
        combinedComparator({ semver: '1.0.0' }),
        true,
        'combined non-semver pseudo selector should use AND logic (true && true = true)',
      )
      t.equal(
        combinedComparator({}),
        true,
        'combined non-semver pseudo selector should return true without version',
      )

      // Test helper function edge cases for getPseudoSelectorFullText
      // These test the fallback paths and edge cases
      const hasSelector = parseBreadcrumb(':semver(1)')
      t.equal(
        hasSelector.first.value,
        ':semver(1)',
        'should reconstruct complex pseudo selector with child selectors',
      )

      // Test a pseudo selector without children
      const simplePseudo = parseBreadcrumb(':root')
      t.equal(
        simplePseudo.first.value,
        ':root',
        'should handle simple pseudo selector without parameters',
      )
    })
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

t.test('Helper Functions', async t => {
  await t.test('removeQuotes', async t => {
    // Test removing double quotes
    t.equal(
      removeQuotes('"hello"'),
      'hello',
      'should remove double quotes',
    )

    // Test with no quotes
    t.equal(
      removeQuotes('hello'),
      'hello',
      'should return unchanged if no quotes',
    )

    // Test with partial quotes
    t.equal(
      removeQuotes('"hello'),
      '"hello',
      'should not remove partial quotes',
    )

    // Test with empty string
    t.equal(removeQuotes(''), '', 'should handle empty string')

    // Test with only quotes
    t.equal(
      removeQuotes('""'),
      '',
      'should handle empty quoted string',
    )
  })

  await t.test('extractPseudoParameter edge cases', async t => {
    // Test with item that has no children
    const itemNoChildren = {
      value: ':test',
    }
    t.same(
      extractPseudoParameter(itemNoChildren),
      {},
      'should return empty object for item with no children',
    )

    // Test with item that has no first node
    const itemNoFirstNode = {
      value: ':test',
      nodes: [],
    }
    t.same(
      extractPseudoParameter(itemNoFirstNode),
      {},
      'should return empty object for item with no first node',
    )

    // Test with non-semver pseudo selector
    const itemNonSemver = {
      value: ':custom',
      type: 'pseudo',
      nodes: ['something'],
    }
    t.same(
      extractPseudoParameter(itemNonSemver),
      {},
      'should return empty object for non-semver selector',
    )
  })

  await t.test('getPseudoSelectorFullText edge cases', async t => {
    // Test with item that has no children
    const itemNoChildren = {
      value: ':root',
    } as any
    t.equal(
      getPseudoSelectorFullText(itemNoChildren),
      ':root',
      'should return base value for item with no children',
    )

    // Test with item that has undefined value
    const itemUndefinedValue = {
      value: undefined,
    } as any
    t.equal(
      getPseudoSelectorFullText(itemUndefinedValue),
      '',
      'should return empty string for undefined value',
    )

    // Test with a selector that has comments in parameters to potentially trigger different node types
    const commentSelector = parseBreadcrumb(':semver(/* test */1)')
    t.equal(
      commentSelector.first.value,
      ':semver(/* test */1)',
      'should handle selectors with comments in parameters',
    )

    // Use real parsed selectors to test the actual function behavior
    const realSelector = parseBreadcrumb(':semver(/*comment*/1)')
    t.equal(
      realSelector.first.value,
      ':semver(/*comment*/1)',
      'should handle real parsed selector with parameters',
    )
  })
})
