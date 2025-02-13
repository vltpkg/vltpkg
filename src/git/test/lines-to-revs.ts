import { linesToRevs } from '../src/lines-to-revs.ts'

const first = [
  'be3270e5fdf0bcc8b0e93bac3f5543703367d9aa\tHEAD',
  'be3270e5fdf0bcc8b0e93bac3f5543703367d9aa\trefs/heads/master',
  '682a9b7a7a452752f50f6adc998a702a88039ab6\trefs/tags/69.42.0',
  'be3270e5fdf0bcc8b0e93bac3f5543703367d9aa\trefs/tags/69.42.0^{}',
  '993448b904674e9869b0e401ba20000ba181b9da\trefs/tags/699007199254740992.0.0',
  'eb559271fa1147bd0a523e38545f0bda824b2380\trefs/tags/699007199254740992.0.0^{}',
  'dc6aac383c4ebcfbf10cc2368d5f3931ebed81f1\trefs/tags/asdf',
  '587741df0e273eedf2d492cc775388bb9cb3305e\trefs/tags/asdf^{}',
  '1195f7beeff67aa73dff96f1e1421a03fed461d3\trefs/tags/quux',
  'b98736b8f65c4c82684622dc5e07848245fedc8e\trefs/tags/quux^{}',
  'a2bf227ee5209e927617863954c208fa52979d14\trefs/tags/version-1.2.3',
  'eb559271fa1147bd0a523e38545f0bda824b2380\trefs/tags/version-1.2.3^{}',
]

const second = [
  '90add9eed16ee6bff5869c006b7245946d881fea\tHEAD',
  'd249e847bfb67c5bc436447a323731ff70d2a7e5\trefs/heads/latest',
  '90add9eed16ee6bff5869c006b7245946d881fea\trefs/heads/master',
  '1111111111111111111111111111111111111111\trefs/pull/1/head',
  '2222222222222222222222222222222222222222\trefs/pull/1/merge',
  '9999999999999999999999999999999999999999\trefs/witaf/is/this^{}',
  '90add9eed16ee6bff5869c006b7245946d881fea\trefs/heads/master',
  'fc6d0a2c3aaccf4cba5aebe38c963b934942b34f\trefs/tags/69.42.0',
  '90add9eed16ee6bff5869c006b7245946d881fea\trefs/tags/69.42.0^{}',
  'b9ad1935ceee7c9bdfc4851743fd7994cf6838a6\trefs/tags/699007199254740992.0.0',
  'd249e847bfb67c5bc436447a323731ff70d2a7e5\trefs/tags/699007199254740992.0.0^{}',
  '4f0de9d26f02f67d77227bf4fcf10ec1549756b0\trefs/tags/asdf',
  '0000000000000000000000000000000000000000\t',
  'fc13b8fcdb7b036bdcdf76c8926033e2f1592362\trefs/tags/asdf^{}',
  '6a8378f1a56a1bb73e6f505194b2611b657efc69\trefs/tags/quux',
  '8c04f438e8f34620f056c7ef4f667ae4b14e55d4\trefs/tags/quux^{}',
  '574ed18efe056281a48bb97d4994d6ca2a00b9fb\trefs/tags/version-1.2.3',
  'd249e847bfb67c5bc436447a323731ff70d2a7e5\trefs/tags/version-1.2.3^{}',
]

import t from 'tap'

// sharing is caring
const shaRE = /^[0-9a-f]{40}$/
const expect = {
  versions: {
    '1.2.3': {
      sha: shaRE,
      ref: 'version-1.2.3',
      type: 'tag',
    },
  },
  'dist-tags': {
    latest: '1.2.3',
    HEAD: '69.42.0',
  },
  refs: {
    latest: {
      sha: shaRE,
      ref: 'latest',
      type: 'branch',
    },
    master: {
      sha: shaRE,
      ref: 'master',
      type: 'branch',
    },
    '699007199254740992.0.0': {
      sha: shaRE,
      ref: '699007199254740992.0.0',
      type: 'tag',
    },
    asdf: {
      sha: shaRE,
      ref: 'asdf',
      type: 'tag',
    },
    quux: {
      sha: shaRE,
      ref: 'quux',
      type: 'tag',
    },
    'version-1.2.3': {
      sha: shaRE,
      ref: 'version-1.2.3',
      type: 'tag',
    },
  },
  shas: Object,
}

t.test('point latest at HEAD', t => {
  const r = linesToRevs(first)
  t.same(r['dist-tags'], {
    HEAD: '69.42.0',
    latest: '69.42.0',
  })
  t.end()
})

t.test('check the revs', t => {
  const r = linesToRevs(second)
  t.match(r, expect)
  Object.keys(r.shas).forEach(sha =>
    r.shas[sha]?.forEach(ref =>
      t.equal(
        r.refs[ref]?.sha,
        sha,
        `shas list is consistent ${ref}`,
      ),
    ),
  )
  t.end()
})
