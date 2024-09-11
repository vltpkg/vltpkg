import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 'error' to fix, or 'warn' to see
const BE_EXTRA = process.env.LINT_SUPER_CONSISTENT ?? 'off'

const ignoresPath = resolve(import.meta.dirname, '.prettierignore')
export default tseslint.config(
  {
    ignores: readFileSync(ignoresPath)
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(v => v.replace(/^(!?)\//, '$1')),
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      /**
       * All the following rules are changed from the defaults set by the eslint and tseslint
       * installed configs. The comments above each one are the reason the default has been changed.
       *  */
      // allow empty catch blocks
      'no-empty': ['error', { allowEmptyCatch: true }],
      // dont force it when destructuring some mutable vars
      'prefer-const': [
        'error',
        {
          destructuring: 'all',
        },
      ],
      // emulate TypeScript behavior of allowing unused prefixed with _
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // allow void arrow functions to not need to be wrapped in braces
      '@typescript-eslint/no-confusing-void-expression': [
        'off',
        {
          ignoreArrowShorthand: true,
        },
      ],
      // while (true) is ok
      '@typescript-eslint/no-unnecessary-condition': [
        'error',
        {
          allowConstantLoopConditions: true,
        },
      ],
      // using both overload signatures and union types
      '@typescript-eslint/unified-signatures': 'off',
      // async functions that dont use await to signal its a Promise
      '@typescript-eslint/require-await': 'off',
      // objects in template expressions and have the default toString method called
      '@typescript-eslint/restrict-template-expressions': 'off',
      // its ok to delete properties. could be a source of slowness though
      '@typescript-eslint/no-dynamic-delete': 'off',
      // empty arrow functions are sometimes necessary
      '@typescript-eslint/no-empty-function': 'off',
      // prefer ?? over ||, except when using primitive values
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignorePrimitives: true,
        },
      ],
      // this rule doesn't catch anything except useful patterns we might need
      '@typescript-eslint/no-this-alias': 'off',
      // allow us to use ts-expect-error directives without descriptions
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': false,
        },
      ],
      // no enums because they mix types/values
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: "Don't declare enums",
        },
      ],
      /**
       * These rules should be turned on at some point in the future but are too much work currently.
       *  */
      // TODO: doesn't play well with how we pass instance methods to error() to capture stack traces
      '@typescript-eslint/unbound-method': 'off',
      // TODO: these rules have to do with unsafe usage of `any`
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // TODO: turn this on
      '@typescript-eslint/class-literal-property-style': 'off',
      /**
       * These rules were turned on originally for their autofixing capabilities and to start
       * from a consistent baseline, but keeping them on creates too much friction day-to-day.
       * They can be enabled temporarily to fix or warn on any questionable usage and then disabled.
       */
      // prefer Record<string,string> over { [k: string]: string }
      '@typescript-eslint/consistent-indexed-object-style': [
        BE_EXTRA,
        'record',
      ],
      // prefer type over interface but force consistent use of one
      '@typescript-eslint/consistent-type-definitions': [
        BE_EXTRA,
        'type',
      ],
      // sort type intersections so named ones come before objects
      '@typescript-eslint/sort-type-constituents': [
        BE_EXTRA,
        {
          // unions don't pose the same readability issue and some cases can't be autofixed
          checkUnions: false,
        },
      ],
    },
  },
  {
    files: ['**/test/**/*.ts'],
    rules: {
      // tap handles these floating promises
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            'test',
            'rejects',
            'resolveMatch',
            'resolves',
          ].map(name => ({
            name,
            from: 'package',
            package: 'tap',
          })),
        },
      ],
      // this is helpful and not really dangerous in tests
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable':
        'off',
      // Duplicate turning off these rules for test files so
      // we can prioritize fixing them in src/ over test/
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...eslint.configs.recommended,
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      ...eslint.configs.recommended.rules,
    },
  },
)
