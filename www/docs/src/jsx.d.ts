import type { JSX as ReactJSX } from 'react'

// @types/mdx and hast-util-to-jsx-runtime type against the global JSX namespace, which React 19 no longer declares
declare global {
  namespace JSX {
    type ElementType = ReactJSX.ElementType
    type Element = ReactJSX.Element
    type ElementClass = ReactJSX.ElementClass
    type IntrinsicElements = ReactJSX.IntrinsicElements
  }
}
