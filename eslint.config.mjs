// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      '**/tap-snapshots/**',
      '**/dist/**',
      '**/.tshy-build/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.mjs'],
          defaultProject: './tsconfig.json',
        },
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
      // emularte TypeScript behavior of allowing unused prefixed with _
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
      // meh these are fine
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable':
        'off',
      // TODO: add descriptions to ts-expect-error comments
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': false,
        },
      ],
      // TODO: doesn't play well with how we pass instance methods to error() to capture stack traces
      '@typescript-eslint/unbound-method': 'off',
      // TODO: these rules have to do with unsafe usage of `any`
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // These rules from tseslint.configs.stylisticTypeChecked are ok
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/class-literal-property-style': 'off',
      '@typescript-eslint/consistent-type-definitions': [
        'error',
        'type',
      ],
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignorePrimitives: true,
        },
      ],
    },
  },
  {
    files: ['**/test/**/*.ts'],
    rules: {
      // top level t.test dont need await. Probably some more fine-grained way to turn this off
      // but not as big of an issue in tests.
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.js'],
    ...eslint.configs.recommended,
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      ...eslint.configs.recommended.rules,
    },
  },
)
