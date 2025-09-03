# VSR Contributing Docs

### Getting Started

#### Installing

- `pnpm install`

#### Building

- `pnpm build` - will build all parts of the project
- `pnpm build:dist` - will build dist directories
- `pnpm build:assets` - will build & move static assets
- `pnpm build:bin` - will build the bin script
- `pnpm build:worker` - will build the worker

#### Database Operations

- `pnpm db:setup`
- `pnpm db:drop`
- `pnpm db:studio`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:push`

#### Serving

- `pnpm serve:build` - will build & start the services
- `pnpm serve:death` - will kill any hanging `wrangler` processes
  (which can happen if you're developing with agents a lot)
- Post-build you can also directly link/run the bin from
  `./dist/bin/vsr.js`
