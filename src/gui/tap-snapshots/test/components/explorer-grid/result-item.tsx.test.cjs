/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/components/explorer-grid/result-item.tsx > TAP > ResultItem render missing version and labels > must match snapshot 1`] = `

<div>
  <div class="relative">
    <a
      href="#"
      class="block rounded-lg border bg-card text-card-foreground shadow-sm relative my-4 cursor-default"
    >
      <div class="rounded-t-lg relative flex flex-row -m-px p-2 px-4 border-b">
        <h3 class="font-semibold tracking-tight text-md grow">
          item
        </h3>
      </div>
      <div class="flex flex-row pl-4 pr-3">
      </div>
    </a>
  </div>
</div>

`

exports[`test/components/explorer-grid/result-item.tsx > TAP > ResultItem render stacked many > must match snapshot 1`] = `

<div>
  <div class="relative">
    <div class="absolute border top-2 left-2 w-[97.5%] h-full bg-card rounded-lg">
    </div>
    <div class="absolute border top-1 left-1 w-[99%] h-full bg-card rounded-lg">
    </div>
    <a
      href="#"
      class="block rounded-lg border bg-card text-card-foreground shadow-sm relative my-4 cursor-default"
    >
      <div class="rounded-t-lg relative flex flex-row -m-px p-2 px-4 border-b">
        <h3 class="font-semibold tracking-tight text-md grow">
          many-edges-stacked
        </h3>
      </div>
      <div class="flex flex-row pl-4 pr-3">
        <p class="text-sm text-muted-foreground grow content-center py-2">
          1.1.1
        </p>
        <div>
          <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 my-2 mx-1 grow-0 border-transparent bg-lime-100 text-neutral-900 hover:bg-lime-100/80">
            peer
          </div>
        </div>
      </div>
    </a>
  </div>
</div>

`

exports[`test/components/explorer-grid/result-item.tsx > TAP > ResultItem render stacked two > must match snapshot 1`] = `

<div>
  <div class="relative">
    <div class="absolute border top-1 left-1 w-[99%] h-full bg-card rounded-lg">
    </div>
    <a
      href="#"
      class="block rounded-lg border bg-card text-card-foreground shadow-sm relative my-4 cursor-default"
    >
      <div class="rounded-t-lg relative flex flex-row -m-px p-2 px-4 border-b">
        <h3 class="font-semibold tracking-tight text-md grow">
          two-edges-stacked
        </h3>
      </div>
      <div class="flex flex-row pl-4 pr-3">
        <p class="text-sm text-muted-foreground grow content-center py-2">
          1.0.0
        </p>
        <div>
          <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 my-2 mx-1 grow-0 border-transparent bg-fuchsia-100 text-neutral-900 hover:bg-fuchsia-100/80">
            dev
          </div>
        </div>
      </div>
    </a>
  </div>
</div>

`

exports[`test/components/explorer-grid/result-item.tsx > TAP > ResultItem render with item > must match snapshot 1`] = `

<div>
  <div class="relative">
    <a
      href="#"
      class="block rounded-lg border bg-card text-card-foreground shadow-sm relative my-4 cursor-default"
    >
      <div class="rounded-t-lg relative flex flex-row -m-px p-2 px-4 border-b">
        <h3 class="font-semibold tracking-tight text-md grow">
          item
        </h3>
      </div>
      <div class="flex flex-row pl-4 pr-3">
        <p class="text-sm text-muted-foreground grow content-center py-2">
          1.0.0
        </p>
        <div>
          <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 my-2 mx-1 grow-0 border-transparent bg-cyan-100 text-neutral-900 hover:bg-cyan-100/80">
            prod
          </div>
        </div>
      </div>
    </a>
  </div>
</div>

`

exports[`test/components/explorer-grid/result-item.tsx > TAP > ResultItem render with type > must match snapshot 1`] = `

<div>
  <div class="relative">
    <a
      href="#"
      class="block rounded-lg border bg-card text-card-foreground shadow-sm relative my-4 cursor-pointer"
    >
      <div class="rounded-t-lg relative flex flex-row -m-px p-2 px-4 border-b">
        <h3 class="font-semibold tracking-tight text-md grow">
          item
        </h3>
        <div class="rounded-md border px-2.5 py-0.5 text-xs text-gray-500">
          <span class="font-semibold">
            prod
          </span>
          <span class="px-1 text-gray-400">
            dep of:
          </span>
          <span class="font-semibold">
            npm:from@1.0.0
          </span>
        </div>
      </div>
      <div class="flex flex-row pl-4 pr-3">
        <p class="text-sm text-muted-foreground grow content-center py-2">
          1.0.0
        </p>
        <div>
          <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 my-2 mx-1 grow-0 border-transparent bg-cyan-100 text-neutral-900 hover:bg-cyan-100/80">
            prod
          </div>
        </div>
      </div>
    </a>
  </div>
</div>

`
