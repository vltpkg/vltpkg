/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/components/explorer-grid/selected-item.tsx > TAP > SelectedItem render connection lines > must match snapshot 1`] = `

<div>
  <div class="relative">
    <gui-card classname="relative my-4 border-primary">
      <gui-card-header classname="flex flex-row p-2 px-3">
        <gui-card-title classname="text-md grow">
          item@^1.0.0
        </gui-card-title>
        <gui-badge classname="grow-0 border-transparent bg-gray-100 text-neutral-900 hover:bg-gray-100/80">
        </gui-badge>
      </gui-card-header>
      <div class="absolute border-l border-solid border-primary w-1 h-[17px] -bottom-[17px] left-1/2">
      </div>
    </gui-card>
    <gui-card classname="relative my-4 border-primary">
      <gui-card-header classname="rounded-t-lg relative flex flex-row -m-px p-2 px-4 bg-primary text-primary-foreground">
        <gui-card-title classname="grow">
          <span class="text-xl">
            item
          </span>
          <span class="mx-2">
            ·
          </span>
          <span class="text-lg text-gray-200">
            1.0.0
          </span>
        </gui-card-title>
      </gui-card-header>
      <div class="flex flex-row pl-4 pr-3">
      </div>
    </gui-card>
    <div class="absolute border-t border-l border-solid border-gray-300 rounded-tl-sm w-2 h-2 top-20 -left-2">
    </div>
    <div class="absolute border-t border-r border-solid border-gray-300 rounded-tr-sm w-2 h-2 top-20 -right-2">
    </div>
  </div>
</div>

`

exports[`test/components/explorer-grid/selected-item.tsx > TAP > SelectedItem render with custom registry > must match snapshot 1`] = `

<div>
  <div class="relative">
    <gui-card classname="relative my-4 border-primary">
      <gui-card-header classname="flex flex-row p-2 px-3">
        <gui-card-title classname="text-md grow">
          item@custom:item@^1.0.0
        </gui-card-title>
        <gui-badge classname="grow-0 border-transparent bg-fuchsia-100 text-neutral-900 hover:bg-fuchsia-100/80">
          dev
        </gui-badge>
      </gui-card-header>
      <div class="absolute border-l border-solid border-primary w-1 h-[17px] -bottom-[17px] left-1/2">
      </div>
    </gui-card>
    <gui-card classname="relative my-4 border-primary">
      <gui-card-header classname="rounded-t-lg relative flex flex-row -m-px p-2 px-4 bg-primary text-primary-foreground">
        <gui-card-title classname="grow">
          <span class="text-xl">
            item
          </span>
          <span class="mx-2">
            ·
          </span>
          <span class="text-lg text-gray-200">
            1.0.0
          </span>
          <div class="text-xs text-gray-200 font-light border border-solid border-gray-200 rounded-sm p-0.5 px-2 float-right mt-[3px]">
            https://example.com
          </div>
        </gui-card-title>
      </gui-card-header>
      <div class="flex flex-row pl-4 pr-3">
      </div>
    </gui-card>
  </div>
</div>

`

exports[`test/components/explorer-grid/selected-item.tsx > TAP > SelectedItem render with default git host > must match snapshot 1`] = `

<div>
  <div class="relative">
    <gui-card classname="relative my-4 border-primary">
      <gui-card-header classname="flex flex-row p-2 px-3">
        <gui-card-title classname="text-md grow">
          item@github:a/b
        </gui-card-title>
        <gui-badge classname="grow-0 border-transparent bg-fuchsia-100 text-neutral-900 hover:bg-fuchsia-100/80">
          dev
        </gui-badge>
      </gui-card-header>
      <div class="absolute border-l border-solid border-primary w-1 h-[17px] -bottom-[17px] left-1/2">
      </div>
    </gui-card>
    <gui-card classname="relative my-4 border-primary">
      <gui-card-header classname="rounded-t-lg relative flex flex-row -m-px p-2 px-4 bg-primary text-primary-foreground">
        <gui-card-title classname="grow">
          <span class="text-xl">
            item
          </span>
          <span class="mx-2">
            ·
          </span>
          <span class="text-lg text-gray-200">
            1.0.0
          </span>
          <div class="text-xs text-gray-200 font-light border border-solid border-gray-200 rounded-sm p-0.5 px-2 float-right mt-[3px]">
            github:a/b
          </div>
        </gui-card-title>
      </gui-card-header>
      <div class="flex flex-row pl-4 pr-3">
      </div>
    </gui-card>
  </div>
</div>

`

exports[`test/components/explorer-grid/selected-item.tsx > TAP > SelectedItem render with item > must match snapshot 1`] = `

<div>
  <div class="relative">
    <gui-card classname="relative my-4 border-primary">
      <gui-card-header classname="rounded-t-lg relative flex flex-row -m-px p-2 px-4 bg-primary text-primary-foreground">
        <gui-card-title classname="grow">
          <span class="text-xl">
            item
          </span>
          <span class="mx-2">
            ·
          </span>
          <span class="text-lg text-gray-200">
            1.0.0
          </span>
        </gui-card-title>
      </gui-card-header>
      <div class="flex flex-row pl-4 pr-3">
      </div>
    </gui-card>
  </div>
</div>

`

exports[`test/components/explorer-grid/selected-item.tsx > TAP > SelectedItem render with scoped registry > must match snapshot 1`] = `

<div>
  <div class="relative">
    <gui-card classname="relative my-4 border-primary">
      <gui-card-header classname="flex flex-row p-2 px-3">
        <gui-card-title classname="text-md grow">
          item@^1.0.0
        </gui-card-title>
        <gui-badge classname="grow-0 border-transparent bg-fuchsia-100 text-neutral-900 hover:bg-fuchsia-100/80">
          dev
        </gui-badge>
      </gui-card-header>
      <div class="absolute border-l border-solid border-primary w-1 h-[17px] -bottom-[17px] left-1/2">
      </div>
    </gui-card>
    <gui-card classname="relative my-4 border-primary">
      <gui-card-header classname="rounded-t-lg relative flex flex-row -m-px p-2 px-4 bg-primary text-primary-foreground">
        <gui-card-title classname="grow">
          <span class="text-xl">
            item
          </span>
          <span class="mx-2">
            ·
          </span>
          <span class="text-lg text-gray-200">
            1.0.0
          </span>
          <div class="text-xs text-gray-200 font-light border border-solid border-gray-200 rounded-sm p-0.5 px-2 float-right mt-[3px]">
            http://custom-scope
          </div>
        </gui-card-title>
      </gui-card-header>
      <div class="flex flex-row pl-4 pr-3">
      </div>
    </gui-card>
  </div>
</div>

`
