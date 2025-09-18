import { Button } from '@/components/ui/button.tsx'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import { tokenVariants } from '@/components/query-bar/query-token.tsx'
import {
  STATE_LABELS,
  ATTRIBUTE_LABELS,
  FUNCTIONAL_LABELS,
  COMBINATOR_LABELS,
  SELECTOR_GROUP_LABEL,
} from '@/components/query-builder/options.ts'
import { PSEUDO_RELATIONSHIP_SELECTORS } from '@/lib/constants/selectors.ts'
import {
  isPseudoUiNode,
  isProjectUiNode,
  isFunctionalPseudo,
  isAttributePseudo,
  isCombinatorUiNode,
  isIdentifierUiNode,
  isTagUiNode,
  isRelationshipPseudo,
  isStatePseudo,
  isStringUiNode,
  isSecurityPseudo,
  isAttributeUiNode,
  isCommaUiNode,
} from '@/components/query-builder/utils.ts'

import type { PropsWithChildren } from 'react'
import type { QueryTokenProps } from '@/components/query-bar/query-token.tsx'
import type { Combinator } from '@/lib/constants/selectors.ts'
import type {
  AttributeUiNode,
  PseudoUiNode,
  UiNode,
} from '@/components/query-builder/ui-node-types.ts'

const Text = ({
  children,
  className,
  variant = 'selector',
}: PropsWithChildren & {
  className?: string
  variant?: QueryTokenProps['variant']
}) => (
  <span
    className={cn(
      tokenVariants({ variant }),
      'inline-flex items-center px-1 leading-6',
      'first:after:rounded-l-[7px] first:after:rounded-r-none odd:after:rounded-none first:odd:after:rounded-l-[7px] even:after:rounded-none',
      className,
    )}>
    {children}
  </span>
)

const TagItem = ({ node }: { node: UiNode }) => (
  <Text variant="tag">{node.value}</Text>
)

const ProjectItem = ({ node }: { node: PseudoUiNode }) => {
  const hostItem = node.children?.[0] ?? {
    type: 'string',
    value: 'unknown',
  }

  if (node.value === ':root') {
    return (
      <>
        <Text variant="selector">project</Text>
        <Text variant="selector">is</Text>
        <Text variant="string">{node.value}</Text>
      </>
    )
  }

  return (
    <>
      <Text variant="pseudo">host</Text>
      <Text variant="selector">is</Text>
      <Text variant={hostItem.type as QueryTokenProps['variant']}>
        {hostItem.value}
      </Text>
    </>
  )
}

const CombinatorItem = ({ node }: { node: UiNode }) => (
  <Text variant="combinator">
    {COMBINATOR_LABELS[node.value as Combinator]}
  </Text>
)

const IdentifierItem = ({ node }: { node: UiNode }) => (
  <>
    <Text variant="selector">name</Text>
    <Text variant="id">{node.value}</Text>
  </>
)

const StringItem = ({ node }: { node: UiNode }) => {
  return <Text variant="string">{node.value}</Text>
}

const AttributeItem = ({ node }: { node: AttributeUiNode }) => {
  return (
    <>
      <Text variant="attribute">{node.attribute}</Text>
      <Text variant="string">{node.value}</Text>
    </>
  )
}

const PseudoItem = ({ node }: { node: PseudoUiNode }) => {
  if (isSecurityPseudo(node)) {
    return (
      <>
        <Text variant="pseudo">{STATE_LABELS[node.value]}</Text>
        {node.children?.map((child, key) => renderNode(child, key))}
      </>
    )
  }

  if (isStatePseudo(node)) {
    return (
      <>
        <Text variant="pseudo">{STATE_LABELS[node.value]}</Text>
        {node.children?.map((child, key) => renderNode(child, key))}
      </>
    )
  }

  if (isAttributePseudo(node)) {
    // Do not render incomplete attribute pseudos (no arguments yet)
    if (!node.children || node.children.length === 0) return null
    return (
      <>
        <Text variant="pseudo">{ATTRIBUTE_LABELS[node.value]}</Text>
        {node.children.map((child, key) => renderNode(child, key))}
      </>
    )
  }

  if (isRelationshipPseudo(node)) {
    return (
      <Text variant="pseudo">
        {PSEUDO_RELATIONSHIP_SELECTORS[node.value].label}
      </Text>
    )
  }

  if (isFunctionalPseudo(node)) {
    // Do not render incomplete functional pseudos (no arguments yet)
    if (!node.children || node.children.length === 0) return null
    return (
      <>
        <Text variant="pseudo">{FUNCTIONAL_LABELS[node.value]}</Text>
        {node.children.map((child, key) => renderNode(child, key))}
      </>
    )
  }
}

const renderNode = (node: UiNode, key?: string | number) => {
  if (isCommaUiNode(node)) {
    return (
      <Text variant="selector" key={key}>
        {SELECTOR_GROUP_LABEL}
      </Text>
    )
  }
  if (isStringUiNode(node)) {
    return <StringItem node={node} key={key} />
  }
  if (isAttributeUiNode(node)) {
    return <AttributeItem node={node} key={key} />
  }
  if (isTagUiNode(node)) {
    return <TagItem node={node} key={key} />
  }
  if (isProjectUiNode(node)) {
    return <ProjectItem node={node} key={key} />
  }
  if (isPseudoUiNode(node)) {
    return <PseudoItem node={node} key={key} />
  }
  if (isCombinatorUiNode(node)) {
    return <CombinatorItem node={node} key={key} />
  }
  if (isIdentifierUiNode(node)) {
    return <IdentifierItem node={node} key={key} />
  }
  return null
}

export const Item = ({
  node,
  onDelete,
}: {
  node: UiNode
  onDelete: () => void
}) => {
  const content = renderNode(node)
  if (!content) return null
  return (
    <div
      className={cn(
        'inline-flex items-center',
        'rounded-lg border-[1px] border-muted',
        '[&:has(>.content:empty)_>.close-button]:border-l-[0px]',
      )}>
      <div
        className={cn(
          'content inline-flex divide-x-[1px] divide-popover',
        )}>
        {content}
      </div>

      <Button
        onClick={onDelete}
        className={cn(
          'close-button',
          'duration-250 m-0 aspect-square size-6 rounded-l-none border-l-[1px] border-muted bg-transparent p-0 text-muted-foreground transition-colors',
          'hover:!bg-neutral-200 hover:text-foreground',
          'dark:bg-transparent dark:hover:!bg-neutral-600',
        )}>
        <X />
      </Button>
    </div>
  )
}
