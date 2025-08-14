import type {
  SelectorType,
  AttributeOperator,
  AttributeFlag,
  PseudoSelector,
} from '@/lib/constants/selectors.ts'

export type BaseUiNode<T extends SelectorType = SelectorType> = {
  type: T
  value: string & {}
}

export type CommaUiNode = {
  type: 'comma'
  value: ','
}

export type PseudoUiNode = BaseUiNode<'pseudo'> & {
  value: PseudoSelector
  children?: UiNode[]
}

export type AttributeUiNode = BaseUiNode<'attribute'> & {
  attribute: string
  operator?: AttributeOperator
  flag?: AttributeFlag
}

export type UiNode =
  | PseudoUiNode
  | AttributeUiNode
  | BaseUiNode<'string'>
  | BaseUiNode<'root'>
  | BaseUiNode<'id'>
  | BaseUiNode<'selector'>
  | BaseUiNode<'combinator'>
  | BaseUiNode<'tag'>
  | CommaUiNode
