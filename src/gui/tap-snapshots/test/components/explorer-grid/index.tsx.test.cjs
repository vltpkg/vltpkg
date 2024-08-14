/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/components/explorer-grid/index.tsx > TAP > explorer-grid render default > must match snapshot 1`] = `

<div>
  <div class="grid grid-cols-7 gap-4">
    <div class="col-span-2">
    </div>
    <div class="col-span-3">
      <div class="pt-6 text-xl flex flex-row font-semibold">
        No Results
      </div>
    </div>
    <div class="col-span-2">
      <div class="h-[7.9rem]">
      </div>
    </div>
  </div>
</div>

`

exports[`test/components/explorer-grid/index.tsx > TAP > explorer-grid with results > must match snapshot 1`] = `

<div>
  <div class="grid grid-cols-7 gap-4">
    <div class="col-span-2">
    </div>
    <div class="col-span-3">
      <div class="pt-6 text-xl flex flex-row font-semibold">
        Results
      </div>
      <div class="relative">
        <a
          href="#"
          class="block rounded-lg border bg-card text-card-foreground shadow-sm relative my-4 cursor-pointer"
        >
          <div class="rounded-t-lg relative flex flex-row -m-px p-2 px-4 border-b">
            <h3 class="font-semibold tracking-tight text-md grow">
              a@^1.0.0
            </h3>
            <div class="rounded-md border px-2.5 py-0.5 text-xs text-gray-500">
              <span class="font-semibold">
                prod
              </span>
              <span class="px-1 text-gray-400">
                dep of:
              </span>
              <span class="font-semibold">
                file(.):root@1.0.0
              </span>
            </div>
          </div>
          <div class="flex flex-row pl-4 pr-3">
            <p class="text-sm text-muted-foreground grow content-center py-2">
              Resolves to: npm:a@1.0.0
            </p>
            <div>
              <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 my-2 mx-1 grow-0 border-transparent bg-cyan-100 text-neutral-900 hover:bg-cyan-100/80">
                prod
              </div>
            </div>
          </div>
        </a>
      </div>
      <div class="relative">
        <a
          href="#"
          class="block rounded-lg border bg-card text-card-foreground shadow-sm relative my-4 cursor-pointer"
        >
          <div class="rounded-t-lg relative flex flex-row -m-px p-2 px-4 border-b">
            <h3 class="font-semibold tracking-tight text-md grow">
              b@^1.0.0
            </h3>
            <div class="rounded-md border px-2.5 py-0.5 text-xs text-gray-500">
              <span class="font-semibold">
                dev
              </span>
              <span class="px-1 text-gray-400">
                dep of:
              </span>
              <span class="font-semibold">
                file(.):root@1.0.0
              </span>
            </div>
          </div>
          <div class="flex flex-row pl-4 pr-3">
            <p class="text-sm text-muted-foreground grow content-center py-2">
              Resolves to: npm:b@1.0.0
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
    <div class="col-span-2">
      <div class="h-[7.9rem]">
      </div>
    </div>
  </div>
</div>

`

exports[`test/components/explorer-grid/index.tsx > TAP > explorer-grid with stack > must match snapshot 1`] = `

<div>
  <div class="grid grid-cols-7 gap-4">
    <div class="col-span-2">
    </div>
    <div class="col-span-3">
      <div class="pt-6 text-xl flex flex-row font-semibold">
        Results
      </div>
      <div class="relative">
        <a
          href="#"
          class="block rounded-lg border bg-card text-card-foreground shadow-sm relative my-4 cursor-pointer"
        >
          <div class="rounded-t-lg relative flex flex-row -m-px p-2 px-4 border-b">
            <h3 class="font-semibold tracking-tight text-md grow">
              a@^1.0.0
            </h3>
            <div class="rounded-md border px-2.5 py-0.5 text-xs text-gray-500">
              <span class="font-semibold">
                prod
              </span>
              <span class="px-1 text-gray-400">
                dep of:
              </span>
              <span class="font-semibold">
                file(.):root@1.0.0
              </span>
            </div>
          </div>
          <div class="flex flex-row pl-4 pr-3">
            <p class="text-sm text-muted-foreground grow content-center py-2">
              Resolves to: npm:a@1.0.0
            </p>
            <div>
              <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 my-2 mx-1 grow-0 border-transparent bg-cyan-100 text-neutral-900 hover:bg-cyan-100/80">
                prod
              </div>
            </div>
          </div>
        </a>
      </div>
      <div class="relative">
        <div class="absolute border top-1 left-1 w-[99%] h-full bg-card rounded-lg">
        </div>
        <a
          href="#"
          class="block rounded-lg border bg-card text-card-foreground shadow-sm relative my-4 cursor-pointer"
        >
          <div class="rounded-t-lg relative flex flex-row -m-px p-2 px-4 border-b">
            <h3 class="font-semibold tracking-tight text-md grow">
              b@^1.0.0
            </h3>
            <div class="rounded-md border px-2.5 py-0.5 text-xs text-gray-500">
              <span class="px-1 text-gray-400">
                dep of:
              </span>
              <span class="font-semibold">
                2 packages
              </span>
            </div>
          </div>
          <div class="flex flex-row pl-4 pr-3">
            <p class="text-sm text-muted-foreground grow content-center py-2">
              Resolves to: npm:b@1.0.0
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
    <div class="col-span-2">
      <div class="h-[7.9rem]">
      </div>
    </div>
  </div>
</div>

`
