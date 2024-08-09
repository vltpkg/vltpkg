import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import { readFileSync } from 'fs'

export default tseslint.config(
  {
    ignores: readFileSync('./.prettierignore')
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
      // prefer type over interface but force consistent use of one
      '@typescript-eslint/consistent-type-definitions': [
        'error',
        'type',
      ],
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
