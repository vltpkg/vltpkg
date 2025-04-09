import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import jsdoc from 'eslint-plugin-jsdoc'
import importPlugin from 'eslint-plugin-import'
import enforceMockImportTypes from './scripts/eslint-enforce-mock-import-types.js'

const MONO_ROOT = import.meta.dirname
const CWD = process.cwd()

// 'error' to fix, or 'warn' to see
const BE_EXTRA = process.env.LINT_SUPER_CONSISTENT ?? 'off'

const unsafeRules = value => ({
  '@typescript-eslint/no-unsafe-argument': value,
  '@typescript-eslint/no-unsafe-assignment': value,
  '@typescript-eslint/no-unsafe-call': value,
  '@typescript-eslint/no-unsafe-member-access': value,
  '@typescript-eslint/no-explicit-any': value,
  '@typescript-eslint/no-unsafe-return': value,
})

export default tseslint.config(
  {
    ignores: [
      ...readFileSync(resolve(MONO_ROOT, '.prettierignore'))
        .toString()
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(v => v.replace(/^(!?)\//, '$1')),
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  jsdoc.configs['flat/recommended-error'],
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    plugins: {
      jsdoc,
      vltpkg: {
        rules: {
          'enforce-mock-import-types': enforceMockImportTypes,
        },
      },
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.node,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project:
            // If run from the root specify glob patterns to all ts projects
            // otherwise just use the tsconfig.json in the current directory
            CWD === MONO_ROOT ?
              [
                'src/*/tsconfig.json',
                'infra/*/tsconfig.json',
                'www/*/tsconfig.json',
              ]
            : ['tsconfig.json'],
        },
        node: true,
      },
    },
    rules: {
      /**
       * All the following rules are changed from the defaults set by the eslint and tseslint
       * installed configs. The comments above each one are the reason the default has been changed.
       */
      // allow empty catch blocks
      'no-empty': ['error', { allowEmptyCatch: true }],
      // dont force it when destructuring some mutable vars
      'prefer-const': [
        'error',
        {
          destructuring: 'all',
        },
      ],
      // this is mostly a CLI which needs to match control characters
      'no-control-regex': 'off',
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
      // allow void in generic type arguments
      '@typescript-eslint/no-invalid-void-type': 'off',
      // allow void arrow functions to not need to be wrapped in braces
      '@typescript-eslint/no-confusing-void-expression': [
        'off',
        {
          ignoreArrowShorthand: true,
        },
      ],
      // allow for async functions when return type is void
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
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
      // Allow throwing unknown since that what is in catch/reject blocks
      'prefer-promise-reject-errors': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': [
        'error',
        {
          allowThrowingUnknown: true,
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
       */
      // TODO: doesn't play well with how we pass instance methods to error() to capture stack traces
      '@typescript-eslint/unbound-method': 'off',
      // TODO: there are good reasons to use any but this is helpful to turn on
      // occassionally to see if there are some where unknown is better
      '@typescript-eslint/no-explicit-any': 'off',
      // TODO: turn this on
      '@typescript-eslint/class-literal-property-style': 'off',
      /**
       * These rules were turned on originally for their autofixing capabilities and to start
       * from a consistent baseline, but keeping them on creates too much friction day-to-day.
       * They can be enabled temporarily to fix or warn on any questionable usage and then disabled.
       */
      // prefer Record<string,string> over { [k: string]: string }
      '@typescript-eslint/consistent-indexed-object-style': [
        /**
         * This is not worth the consistency so it is now always off. We use
         * recursive types which break when autofixed to Record, and mapped
         * types provide a name for the key which is nice in many cases.
         */ 0,
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
      // use inline type imports
      '@typescript-eslint/consistent-type-imports': [
        2,
        {
          disallowTypeAnnotations: false,
          fixStyle: 'inline-type-imports',
        },
      ],
      'import/no-duplicates': ['error', { 'prefer-inline': false }],
      'import/consistent-type-specifier-style': [
        2,
        'prefer-top-level',
      ],
      // eslint-plugin-import
      'import/no-named-as-default': 0,
      'import/no-named-as-default-member': 0,
      'import/extensions': [2, 'ignorePackages'],
      // eslint-plugin-jsdoc
      'jsdoc/no-undefined-types': 2,
      'jsdoc/require-param': 0,
      'jsdoc/require-returns': 0,
      'jsdoc/require-yields': 0,
      'jsdoc/require-param-description': 0,
      'jsdoc/require-returns-description': 0,
      'jsdoc/require-jsdoc': 0,
      // custom
      'vltpkg/enforce-mock-import-types': 'error',
    },
  },
  {
    /**
     * Tests
     */
    files: ['**/test/**/*.{ts,tsx}'],
    rules: {
      // tap handles these floating promises
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: ['test', 'skip', 'todo'].map(
            name => ({
              name,
              from: 'package',
              package: 'tap',
            }),
          ),
        },
      ],
      ...unsafeRules('off'),
      // this is helpful and not really dangerous in tests
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable':
        'off',
    },
  },
  {
    /**
     * shadcn-ui specific patterns
     */
    files: ['{src/gui,www/docs}/src/components/ui/*.{tsx,ts}'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    /**
     * TypeScript files must import TypeScript extensions
     */
    files: ['**/*.{ts,mts,tsx}'],
    rules: {
      'import/extensions': [
        'error',
        'always',
        {
          ignorePackages: true,
          pattern: {
            js: 'never',
            mjs: 'never',
            jsx: 'never',
          },
        },
      ],
    },
  },
  {
    /**
     * These workspaces use path aliases which are difficult to
     * configure with import/extensions and these workspaces are run
     * in the browser primarily so they don't need have the strict need
     * to enforce .ts extensions for use with rewriteRelativeImportExtensions.
     */
    files: ['{src/gui,www/docs}/**/*.{ts,tsx,mts}'],
    rules: {
      'import/extensions': 'off',
    },
  },
  {
    /**
     * Astro
     */
    files: ['www/docs/**/*.{ts,tsx}'],
    rules: {
      'import/no-unresolved': [
        2,
        {
          // https://github.com/import-js/eslint-import-resolver-typescript/issues/261
          ignore: ['astro:content', 'virtual:starlight/user-config'],
        },
      ],
    },
  },
  {
    files: ['src/*/src/**/*.ts'],
    rules: {
      'no-console': 2,
    },
  },
  {
    files: ['src/cli-sdk/test/**/*/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        ...['log', 'error'].map(method => ({
          selector: `CallExpression[callee.object.name='console'][callee.property.name='${method}']`,
          message: `\`console.${method}\` is often captured in these tests so calling it might not show anything. Use another method like \`console.info\` or \`t.comment\` instead.`,
        })),
      ],
    },
  },
  {
    /**
     * Benchmarks must be run against dist code and the import/no-unresolved
     * looks at the state of the filesystem so these files could fail intermittently
     * based on what has been built which is no good. So we turn it off.
     */
    files: ['src/semver/benchmarks/this.js'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
  {
    /**
     * Plain JS code.
     * TODO: there is a way to get typechecking with tseslint for
     * JS code but I couldn't get it configured right. Might be worth
     * looking in to for our JS scripts.
     */
    files: ['**/*.{js,mjs,cjs}'],
    ...eslint.configs.recommended,
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      ...eslint.configs.recommended.rules,
    },
  },
)
