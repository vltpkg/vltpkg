/** @type {import("prettier").Config} */
export default {
  experimentalTernaries: true,
  semi: false,
  printWidth: 70,
  tabWidth: 2,
  useTabs: false,
  singleQuote: true,
  jsxSingleQuote: false,
  bracketSameLine: true,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
      },
    },
    {
      files: '*.mdx',
      options: {
        proseWrap: 'always',
      },
    },
  ],
}
