/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/components/search-bar.tsx > TAP > search-bar render default > must match snapshot 1`] = `

<div>
  <div class="flex grow items-center space-x-2">
    <input
      type="search"
      class="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:w-[35.25rem] w-96"
      placeholder="Query Lookup, e.g: :root > *"
      value=":project > *"
    >
  </div>
</div>

`

exports[`test/components/search-bar.tsx > TAP > search-bar render with custom query > must match snapshot 1`] = `

<div>
  <div class="flex grow items-center space-x-2">
    <input
      type="search"
      class="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:w-[35.25rem] w-96"
      placeholder="Query Lookup, e.g: :root > *"
      value="[name=&quot;my-package&quot;][version=&quot;1.0.0&quot;]"
    >
  </div>
</div>

`
