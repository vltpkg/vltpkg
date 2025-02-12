import t from 'tap'
import { getAuthorFromGitUser } from '../src/get-author-from-git-user.ts'

t.strictSame(
  getAuthorFromGitUser({
    name: 'Ruy Adorno',
    email: 'ruy@example.com',
  }),
  'Ruy Adorno <ruy@example.com>',
  'should return the expected author string',
)

t.strictSame(
  getAuthorFromGitUser(),
  '',
  'should return an empty string if no user provided',
)

t.strictSame(
  getAuthorFromGitUser({
    name: 'Foo',
  }),
  'Foo',
  'should return name only',
)

t.strictSame(
  getAuthorFromGitUser({
    email: 'foo@bar.ca',
  }),
  '<foo@bar.ca>',
  'should return email only',
)

t.strictSame(
  getAuthorFromGitUser({
    name: '',
    email: 'foo@bar.ca',
  }),
  '<foo@bar.ca>',
  'should return email ignoring empty name',
)

t.strictSame(
  getAuthorFromGitUser({
    name: 'Lorem Ipsum',
    email: '',
  }),
  'Lorem Ipsum',
  'should return name ignoring empty email',
)
