const FAVORITE_PACKAGES: string[] = [
  'varlock',
  'react',
  'react-dom',
  'lodash',
  'axios',
  'express',
  'cors',
  'typescript',
  'eslint',
  'prettier',
  'webpack',
  'vite',
  'next',
  'zustand',
  'jotai',
  'redux',
  'react-router-dom',
  'tailwindcss',
  'classnames',
  'moment',
  'dayjs',
  'uuid',
  'chalk',
  'jsonwebtoken',
  'bcrypt',
]

type FavoritePackage = (typeof FAVORITE_PACKAGES)[number]

export { FAVORITE_PACKAGES, type FavoritePackage }
