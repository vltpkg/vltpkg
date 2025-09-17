import {
  ATTRIBUTE_FLAGS,
  ATTRIBUTE_OPERATORS,
  COMBINATOR_SELECTORS,
  PSEUDO_PROJECT_SELECTORS,
  PSEUDO_SECURITY_SELECTORS,
  PSEUDO_RELATIONSHIP_SELECTORS,
  PSEUDO_STATE_SELECTORS,
} from '@/lib/constants/selectors.ts'

import type {
  PSEUDO_ATTRIBUTE_SELECTOR,
  PSEUDO_FUNCTIONAL_CLASSES,
  ArgumentType,
  AttributeFlag,
  AttributeOperator,
  Combinator,
  Flag,
  Operator,
} from '@/lib/constants/selectors.ts'
import type { UiNode } from '@/components/query-builder/ui-node-types.ts'
import type {
  QueryBuilderGroup,
  QueryBuilderItem,
} from '@/components/query-builder/builder.tsx'
import type {
  Manifest,
  NormalizedBugsEntry,
  NormalizedContributorEntry,
  NormalizedFundingEntry,
  NormalizedKeywords,
} from '@vltpkg/types'

type PseudoStateItem =
  | keyof typeof PSEUDO_STATE_SELECTORS
  | keyof typeof PSEUDO_SECURITY_SELECTORS

export const STATE_LABELS: Record<PseudoStateItem, string> = {
  ':empty': 'no dependencies',
  ':scope': 'scope of',
  ':private': 'private',
  ':outdated': 'outdated',
  ':semver': 'a version of',
  ':type': 'a type of',
  ':published': 'published',
  ':score': 'a score of',
  ':abandoned': 'abandoned',
  ':confused': 'confused',
  ':debug': 'debug features',
  ':deprecated': 'a deprecated package',
  ':dynamic': 'dynamic imports',
  ':entropic': 'entropic strings',
  ':env': 'env variable access',
  ':eval': 'dynamic code execution',
  ':fs': 'file system access',
  ':license': 'license issues',
  ':malware': 'malware',
  ':minified': 'minified code',
  ':native': 'native code',
  ':network': 'network access',
  ':obfuscated': 'obfuscated code',
  ':scripts': 'install scripts',
  ':shell': 'shell access',
  ':shrinkwrap': 'shrinkwrap file',
  ':squat': 'typosquats',
  ':suspicious': 'suspicious',
  ':tracker': 'telemtery',
  ':trivial': 'trivial package',
  ':undesirable': 'undesirable',
  ':unknown': 'unknown collaborators',
  ':unmaintained': 'unmaintained',
  ':unpopular': 'unpopular',
  ':unstable': 'unstable',
}

export const ATTRIBUTE_LABELS: Record<
  keyof typeof PSEUDO_ATTRIBUTE_SELECTOR,
  string
> = {
  ':attr': 'with attribute',
  ':v': 'with version',
}

export const FUNCTIONAL_LABELS: Record<
  keyof typeof PSEUDO_FUNCTIONAL_CLASSES,
  string
> = {
  ':is': 'and matches',
  ':has': 'and has',
  ':not': 'and does not match',
}

export const COMBINATOR_LABELS: Record<Combinator, string> = {
  '>': 'and direct dependencies with',
  '~': 'and sibling dependencies with',
  ' ': 'and any dependencies with',
}

// Label for selector-list separator (",") used to group multiple selectors
export const SELECTOR_GROUP_LABEL = 'and'

export const PROJECT_SELECTORS = [
  ':host-context',
  ':project',
  ':workspace',
  ':root',
] as const

export interface QueryBuilderToken {
  token: string
  type: UiNode['type']
  argumentType?: ArgumentType
  values?: string[]
  label: string
  description: string
  operators?: Operator[]
  flags?: Flag[]
  operator?: string
  flag?: string
}

export const relationshipOptions = {
  header: 'Relationship',
  items: Object.entries(PSEUDO_RELATIONSHIP_SELECTORS).map(
    ([token, selector]) => ({
      label: selector.label,
      token: {
        token,
        type: selector.category,
        label: selector.label,
        description: selector.description,
      },
    }),
  ),
}

export const combinatorOptions: QueryBuilderGroup = {
  header: 'Connection Type',
  items: Object.entries(COMBINATOR_SELECTORS).map(
    ([token, selector]) => ({
      label: selector.label,
      token: {
        token,
        type: selector.category,
        label: selector.label,
        description: selector.description,
      },
    }),
  ),
}

export const projectOptions: QueryBuilderGroup = {
  header: 'Project',
  items: Object.entries(PSEUDO_PROJECT_SELECTORS).map(
    ([token, selector]) => ({
      label: selector.label,
      token: {
        token,
        type: selector.category,
        label: selector.label,
        description: selector.description,
      },
    }),
  ),
}

export const stateOptions: QueryBuilderGroup = {
  header: 'State',
  items: Object.entries(PSEUDO_STATE_SELECTORS).map(
    ([token, selector]) => ({
      label: selector.label,
      options:
        'arguments' in selector ?
          {
            label: 'Options',
            options: selector.arguments.map(arg => ({
              label: arg.label,
              token: {
                argumentType:
                  'argumentType' in arg ?
                    (arg.argumentType as ArgumentType)
                  : undefined,
                token: arg.argument,
                operators:
                  'operators' in arg ? arg.operators : undefined,
                flags:
                  'flags' in arg ? (arg.flags as Flag[]) : undefined,
                type:
                  'category' in arg ?
                    arg.category
                  : selector.category,
                label: arg.label,
                description: arg.description,
              },
            })),
          }
        : undefined,
      token: {
        token,
        label: selector.label,
        type: selector.category,
        description: selector.description,
      },
    }),
  ),
}

export const insightOptions: QueryBuilderGroup = {
  header: 'Insights',
  items: Object.entries(PSEUDO_SECURITY_SELECTORS).map(
    ([token, selector]) => ({
      label: selector.label,
      options:
        'arguments' in selector ?
          {
            label: 'Options',
            options: selector.arguments.map(arg => ({
              label: arg.label,
              token: {
                argumentType:
                  'argumentType' in arg ?
                    (arg.argumentType as ArgumentType)
                  : undefined,
                token: arg.argument,
                operators:
                  'operators' in arg ?
                    (arg.operators as Operator[])
                  : undefined,
                flags:
                  'flags' in arg ? (arg.flags as Flag[]) : undefined,
                type:
                  'category' in arg ?
                    arg.category
                  : selector.category,
                label: arg.label,
                description: arg.description,
              },
            })),
          }
        : undefined,
      token: {
        token,
        label: selector.label,
        type: selector.category,
        description: selector.description,
      },
    }),
  ),
}

type NormalizedManifest = Omit<
  Manifest,
  'contributors' | 'funding' | 'keywords' | 'bugs'
> & {
  contributors?: NormalizedContributorEntry[]
  funding?: NormalizedFundingEntry[]
  bugs?: NormalizedBugsEntry[]
  keywords?: NormalizedKeywords
}

const SIMPLE_ATTRIBUTE_LABELS = {
  name: 'Package name',
  version: 'Package version',
  description: 'Package description',
  homepage: 'Homepage URL',
  license: 'License',
  author: 'Author',
  main: 'Main entry point',
  dependencies: 'Dependencies',
  devDependencies: 'Development dependencies',
  peerDependencies: 'Peer dependencies',
  optionalDependencies: 'Optional dependencies',
  private: 'Private package',
  type: 'Module type',
} as const satisfies Partial<Record<keyof NormalizedManifest, string>>

const NESTED_ATTRIBUTE_LABELS = {
  contributors: {
    label: 'Contributors',
    options: {
      name: 'Contributor name',
      email: 'Contributor email',
      writeAccess: 'Write access',
      isPublisher: 'Is publisher',
    },
  },
  funding: {
    label: 'Funding',
    options: {
      type: 'Funding type',
      url: 'Funding URL',
    },
  },
  bugs: {
    label: 'Bug tracker',
    options: {
      url: 'Bug tracker URL',
      email: 'Bug tracker email',
    },
  },
  keywords: {
    label: 'Keywords',
    options: {
      value: 'Keyword value',
    },
  },
} as const satisfies Record<
  keyof Pick<
    NormalizedManifest,
    'contributors' | 'funding' | 'bugs' | 'keywords'
  >,
  {
    label: string
    options: Record<string, string>
  }
>

const ATTRIBUTE_OPERATORS_LIST: Operator[] = Object.entries(
  ATTRIBUTE_OPERATORS,
).map(([operator, label]) => ({
  operator: operator as AttributeOperator,
  label,
  description: `${label} the specified value`,
}))

const ATTRIBUTE_FLAGS_LIST: Flag[] = Object.entries(
  ATTRIBUTE_FLAGS,
).map(([flag, label]) => ({
  flag: flag as AttributeFlag,
  label,
  description: `Make the search ${label}`,
}))

const createSimpleAttributeItem = (
  attributeKey: string,
  attributeLabel: string,
): QueryBuilderItem => ({
  label: attributeLabel,
  token: {
    token: attributeKey,
    type: 'attribute' as const,
    argumentType: 'input' as const,
    label: attributeLabel,
    description: `Match packages by ${attributeLabel.toLowerCase()}`,
    operators: ATTRIBUTE_OPERATORS_LIST,
    flags: ATTRIBUTE_FLAGS_LIST,
    operator: '=',
    flag: '',
  },
})

const createNestedAttributeItem = (
  attributeKey: string,
  nestedConfig: (typeof NESTED_ATTRIBUTE_LABELS)[keyof typeof NESTED_ATTRIBUTE_LABELS],
): QueryBuilderItem => ({
  label: nestedConfig.label,
  options: {
    label: `${nestedConfig.label} Properties`,
    options: Object.entries(nestedConfig.options).map(
      ([nestedKey, nestedLabel]) => ({
        label: nestedLabel,
        token: {
          token: nestedKey,
          type: 'attribute' as const,
          argumentType: 'input' as const,
          values:
            (
              attributeKey === 'contributors' &&
              (nestedKey === 'writeAccess' ||
                nestedKey === 'isPublisher')
            ) ?
              ['true', 'false']
            : undefined,
          label: nestedLabel,
          description: `Match packages by ${nestedLabel.toLowerCase()} in ${nestedConfig.label.toLowerCase()}`,
          operators: ATTRIBUTE_OPERATORS_LIST,
          flags: ATTRIBUTE_FLAGS_LIST,
          operator: '=',
          flag: '',
        },
      }),
    ),
  },
  token: {
    token: attributeKey,
    type: 'pseudo' as const,
    label: nestedConfig.label,
    description: `Match packages by ${nestedConfig.label.toLowerCase()}`,
  },
})

export const attributeOptions: QueryBuilderGroup = {
  header: 'Attributes',
  items: [
    ...Object.entries(SIMPLE_ATTRIBUTE_LABELS).map(
      ([attributeKey, attributeLabel]) =>
        createSimpleAttributeItem(attributeKey, attributeLabel),
    ),
    ...Object.entries(NESTED_ATTRIBUTE_LABELS).map(
      ([attributeKey, nestedConfig]) =>
        createNestedAttributeItem(attributeKey, nestedConfig),
    ),
  ],
}
