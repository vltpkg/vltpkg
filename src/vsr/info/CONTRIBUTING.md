# VSR Contributing Docs

### Getting Started

#### Installing

- `vlt install`

#### Building

- `vlr build` - will build all parts of the project
- `vlr build:dist` - will build dist directories
- `vlr build:assets` - will build & move static assets
- `vlr build:bin` - will build the bin script
- `vlr build:worker` - will build the worker

#### Database Operations

- `vlr db:setup`
- `vlr db:drop`
- `vlr db:studio`
- `vlr db:generate`
- `vlr db:migrate`
- `vlr db:push`

#### Serving

- `vlr serve:build` - will build & start the services
- `vlr serve:death` - will kill any hanging `wrangler` processes
  (which can happen if you're developing with agents a lot)
- Post-build you can also directly link/run the bin from
  `./dist/bin/vsr.js`
