import t from 'tap'
import { commandUsage } from '../../src/config/usage.ts'
import { Jack } from 'jackspeak'

const j = commandUsage({
  command: 'install',
  usage: 'hello this is how to use it',
  description: 'describe the thing',
  subcommands: {
    sub: { usage: 'command', description: 'sub desc' },
    dub: { usage: ['com', 'mand'], description: 'dub desc' },
  },
  examples: {
    ex: { description: 'ample' },
  },
  options: {
    oppy: {
      description: 'describe the option',
      value: 'true or false',
    },
    flag: {
      description: 'describe the flag',
    },
  },
})

t.type(j, Jack)
t.matchSnapshot(j.usageMarkdown())
