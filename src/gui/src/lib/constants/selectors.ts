import type { PostcssNode } from '@vltpkg/dss-parser'
import type { PackageAlert } from '@vltpkg/security-archive'

export type SelectorType = PostcssNode['type']
export type ArgumentType = 'input' | 'date'

export type SocketSeverity = PackageAlert['severity']
export type SocketCategory =
  | 'Unknown'
  | 'Supply Chain'
  | 'Quality'
  | 'Maintenance'
  | 'License'
  | 'Vulnerability'

interface Argument {
  argumentType?: ArgumentType
  category: SelectorType
  argument: string
  label: string
  description: string
  operators?: Operator[]
  flags?: Flag[]
  severity?: SocketSeverity
}

export interface Operator {
  operator:
    | AttributeOperator
    | ScoreOpeartor
    | SemverOperator
    | PublishedOperator
  label: string
  description: string
}

export interface Flag {
  flag: AttributeFlag
  label: string
  description: string
}

export interface Selector {
  selector: string
  category: SelectorType
  label?: string
  description: string
  arguments?: Argument[]
  severity?: SocketSeverity
  securityCategory?: SocketCategory
}

export interface SocketSecurityDetails {
  selector: string
  description: string
  category: SocketCategory
  severity: SocketSeverity
}

export type AttributeOperator = '=' | '^=' | '$=' | '~=' | '|=' | '*='
export type SemverOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'satisfies'
export type ScoreOpeartor = '>' | '<' | '>=' | '<=' | '='
export type PublishedOperator = '>' | '<' | '>=' | '<=' | '='

export type Combinator = '>' | ' ' | '~'

export type AttributeFlag = 'i' | 's'

export type PseudoSelector =
  | keyof typeof PSEUDO_RELATIONSHIP_SELECTORS
  | keyof typeof PSEUDO_PROJECT_SELECTORS
  | keyof typeof PSEUDO_STATE_SELECTORS
  | keyof typeof PSEUDO_FUNCTIONAL_CLASSES
  | keyof typeof PSEUDO_ATTRIBUTE_SELECTOR
  | keyof typeof PSEUDO_SECURITY_SELECTORS

const PUBLISHED_OPERATORS: Operator[] = [
  {
    operator: '>',
    label: 'greater than',
    description:
      'Matches packages published after the specified date.',
  },
  {
    operator: '>=',
    label: 'greater than or equal to',
    description:
      'Matches packages published on or after the specified date.',
  },
  {
    operator: '<',
    label: 'less than',
    description:
      'Matches packages published before the specified date.',
  },
  {
    operator: '<=',
    label: 'less than or equal to',
    description:
      'Matches packages published on or before the specified date.',
  },
  {
    operator: '=',
    label: 'equal to',
    description: 'Matches packages published on the specified date.',
  },
]

const SCORE_OPERATORS: Operator[] = [
  {
    operator: '>',
    label: 'less than',
    description: 'Less than the score.',
  },
  {
    operator: '<=',
    label: 'less than or equal to',
    description: 'Less than or equal to the score.',
  },
  {
    operator: '>',
    label: 'greater than',
    description: 'Greater than the score.',
  },
  {
    operator: '>=',
    label: 'greater than or equal to',
    description: 'Greater than or equal to the score.',
  },
  {
    operator: '=',
    label: 'equal to',
    description: 'Equal to the value.',
  },
]

const SEMVER_OPERATORS: Operator[] = [
  {
    operator: 'eq',
    label: 'equals',
    description:
      'Matches packages that equal the specified semver value.',
  },
  {
    operator: 'neq',
    label: 'not equal',
    description:
      'Matches packages that do not equal the specified semver value.',
  },
  {
    operator: 'gt',
    label: 'greater than',
    description:
      'Matches packages with a version greater than the specified semver value.',
  },
  {
    operator: 'gte',
    label: 'greater than or equal to',
    description:
      'Matches packages with a version greater than or equal to the specified semver value.',
  },
  {
    operator: 'lt',
    label: 'less than',
    description:
      'Matches packages with a version less than the specified semver value.',
  },
  {
    operator: 'lte',
    label: 'less than or equal to',
    description:
      'Matches packages with a version less than or equal to the specified semver value.',
  },
  {
    operator: 'satisfies',
    label: 'satisfies',
    description:
      'Matches packages that satisfy the specified semver range.',
  },
]

export const ATTRIBUTE_OPERATORS = {
  '=': 'equals',
  '^=': 'starts with',
  '$=': 'ends with',
  '~=': 'contains word',
  '|=': 'starts with dash',
  '*=': 'contains',
} as const satisfies Record<AttributeOperator, string>

export const ATTRIBUTE_FLAGS = {
  i: 'case insensitive',
  s: 'case sensitive',
} as const satisfies Record<AttributeFlag, string>

export const COMBINATOR_SELECTORS = {
  '>': {
    selector: '>',
    category: 'combinator',
    label: 'Direct children',
    description:
      'Child combinator, matches packages that are direct dependencies of the previously selected nodes.',
  },
  ' ': {
    selector: ' ',
    category: 'combinator',
    label: 'All descendants',
    description:
      'Descendant combinator, matches all packages that are direct & transitive dependencies of the previously selected nodes.',
  },
  '~': {
    selector: '~',
    category: 'combinator',
    label: 'Siblings',
    description:
      'Sibling combinator, matches packages that are direct dependencies of all dependents of the previously selected nodes.',
  },
} as const satisfies Record<Combinator, Selector>

export const PSEUDO_FUNCTIONAL_CLASSES = {
  ':has': {
    selector: ':has',
    category: 'pseudo',
    description:
      'Matches only packages that have valid results for the selector expression used. For example, :has(.peer[name=react]) matches packages with a peer dependency on react.',
  },
  ':is': {
    selector: ':is',
    category: 'pseudo',
    description:
      'Useful for writing large selectors in a more compact form. It takes a selector list as its arguments and selects any element that can be selected by one of the selectors in that list. It behaves forgivingly, ignoring non-existing ids, classes, combinators, operators, and pseudo-selectors.',
  },
  ':not': {
    selector: ':not',
    category: 'pseudo',
    description:
      'Negation pseudo-class, selects packages that do not match a list of selectors.',
  },
} as const satisfies Record<string, Selector>

export const PSEUDO_RELATIONSHIP_SELECTORS = {
  ':prod': {
    selector: ':prod',
    label: 'Production dependencies',
    category: 'pseudo',
    description: 'Matches prod dependencies to your current project.',
  },
  ':dev': {
    selector: ':dev',
    label: 'Development dependencies',
    category: 'pseudo',
    description:
      'Matches packages that are only used as dev dependencies in your current project.',
  },
  ':optional': {
    selector: ':optional',
    label: 'Optional dependencies',
    category: 'pseudo',
    description:
      'Matches packages that are optional to your current project.',
  },
  ':peer': {
    selector: ':peer',
    label: 'Peer dependencies',
    category: 'pseudo',
    description: 'Matches peer dependencies to your current project.',
  },
} as const satisfies Record<string, Selector>

export const PSEUDO_PROJECT_SELECTORS = {
  ':workspace': {
    selector: ':workspace',
    label: 'Matches workspaces in `vlt.json`',
    category: 'pseudo',
    description:
      'Matches the current project workspaces (listed in your vlt.json file).',
  },
  ':project': {
    selector: ':project',
    label: 'Root project / all workspaces',
    category: 'pseudo',
    description:
      'Returns both the root node (as defined below) along with any workspace declared in your project.',
  },
  ':root': {
    selector: ':root',
    label: 'Root package',
    category: 'pseudo',
    description:
      'Returns the root node, that represents the package defined at the top-level package.json of your project folder.',
  },
} as const satisfies Record<string, Selector>

export const PSEUDO_ATTRIBUTE_SELECTOR = {
  ':attr': {
    selector: ':attr()',
    label: 'Contains selector',
    category: 'pseudo',
    description:
      'Matches packages based on a custom attribute, e.g., :attr(license,[name=MIT]) to match packages with a license attribute that has a name of MIT.',
  },
  ':v': {
    selector: ':v()',
    label: 'Contains version',
    category: 'pseudo',
    description:
      'Matches packages based on a version, e.g., :v(1.0.0) to match packages with a version attribute that has a name of 1.0.0.',
  },
} as const satisfies Record<string, Selector>

export const PSEUDO_SECURITY_SELECTORS = {
  ':abandoned': {
    label: 'Abandoned packages',
    selector: ':abandoned',
    category: 'pseudo',
    description: 'Packages that are missing an author field',
    securityCategory: 'Supply Chain',
    severity: 'medium',
  },
  ':confused': {
    label: 'Manifest confusion',
    selector: ':confused',
    category: 'pseudo',
    description:
      'Packages affected by manifest confusion. This could be malicious or caused by an error when publishing the package',
    securityCategory: 'Supply Chain',
    severity: 'medium',
  },
  ':debug': {
    label: 'Debugging features',
    selector: ':debug',
    category: 'pseudo',
    description:
      'Packages that use debug, reflection and dynamic code execution features',
    securityCategory: 'Supply Chain',
    severity: 'low',
  },
  ':deprecated': {
    label: 'Deprecated packages',
    selector: ':deprecated',
    category: 'pseudo',
    description:
      'Packages marked as deprecated. This could indicate that a single version should not be used, or that the package is no longer maintained and any new vulnerabilities will not be fixed',
    securityCategory: 'Maintenance',
    severity: 'medium',
  },
  ':dynamic': {
    label: 'Dynamic imports',
    selector: ':dynamic',
    category: 'pseudo',
    description: 'Packages that uses dynamic imports',
    securityCategory: 'Supply Chain',
    severity: 'low',
  },
  ':entropic': {
    label: 'Entropic strings',
    selector: ':entropic',
    category: 'pseudo',
    description:
      'Packages that contains high entropic strings. This could be a sign of encrypted data, leaked secrets or obfuscated code',
    securityCategory: 'Supply Chain',
    severity: 'low',
  },
  ':env': {
    label: 'Environment variables',
    selector: ':env',
    category: 'pseudo',
    description:
      'Packages that accesses environment variables, which may be a sign of credential stuffing or data theft',
    securityCategory: 'Supply Chain',
    severity: 'low',
  },
  ':eval': {
    label: 'Dynamic code execution',
    selector: ':eval',
    category: 'pseudo',
    description:
      'Packages that use dynamic code execution (e.g., eval()), which is a dangerous practice. This can prevent the code from running in certain environments and increases the risk that the code may contain exploits or malicious behavior',
    securityCategory: 'Supply Chain',
    severity: 'medium',
  },
  ':fs': {
    label: 'File system access',
    selector: ':fs',
    category: 'pseudo',
    description:
      'Packages that accesses the file system, and could potentially read sensitive data',
    securityCategory: 'Supply Chain',
    severity: 'low',
  },
  ':license': {
    label: 'License',
    selector: ':license(<type>)',
    category: 'pseudo',
    description:
      'Packages that have a license. This selector can be used to filter packages based on their license type.',
    securityCategory: 'License',
    arguments: [
      {
        argument: 'ambiguous',
        category: 'tag',
        label: 'Ambiguous',
        description:
          'Packages with ambiguous classifiers. This could be due to multiple licenses or unclear license terms.',
        severity: 'low',
      },
      {
        argument: 'copyleft',
        category: 'tag',
        label: 'Copyleft',
        description:
          'Packages with copyleft licenses. These licenses require derivative works to also be open source.',
        severity: 'low',
      },
      {
        argument: 'exception',
        category: 'tag',
        label: 'Exception',
        description:
          'Packages with license exceptions. These are special permissions that modify the terms of the license.',
        severity: 'low',
      },
      {
        argument: 'misc',
        category: 'tag',
        label: 'Miscellaneous',
        description:
          'Packages with fine-grained problems related to their license.',
        severity: 'medium',
      },
      {
        argument: 'none',
        category: 'tag',
        label: 'No License Found',
        description:
          'Packages with no license found. This could indicate that the package is not open source or has unclear licensing.',
        severity: 'low',
      },
      {
        argument: 'restricted',
        category: 'tag',
        label: 'Restricted',
        description:
          'Packages with non-permissive licenses. These licenses may restrict usage, modification, or distribution.',
        severity: 'low',
      },
      {
        argument: 'unknown',
        category: 'tag',
        label: 'Unknown License',
        description:
          'Packages with unidentified licenses. This could be due to missing or incomplete license information.',
        severity: 'low',
      },
      {
        argument: 'unlicensed',
        category: 'tag',
        label: 'Unlicensed',
        description:
          'Packages that are explicitly unlicensed. This means they have no copyright protection and can be used freely.',
        severity: 'high',
      },
    ],
  },
  ':malware': {
    label: 'Has malware',
    selector: ':malware(<severity>)',
    category: 'pseudo',
    description:
      'Packages that are known to contain malware. This is determined by AI based on the package contents and metadata',
    securityCategory: 'Supply Chain',
    arguments: [
      {
        argument: 'low',
        category: 'tag',
        label: 'Low severity',
        description:
          'AI has identified unusual behaviors that may pose a security risk',
        severity: 'low',
      },
      {
        argument: 'medium',
        category: 'tag',
        label: 'Medium severity',
        description:
          'AI has determined that this package may contain potential security issues or vulnerabilities',
        severity: 'high',
      },
      {
        argument: 'high',
        category: 'tag',
        label: 'High severity',
        description:
          'AI has identified this package as containing malware',
        severity: 'high',
      },
      {
        argument: 'critical',
        category: 'tag',
        label: 'Critical severity',
        description: 'Packages that is and contains known malware',
        severity: 'critical',
      },
    ],
  },
  ':minified': {
    label: 'Minified code',
    selector: ':minified',
    category: 'pseudo',
    description:
      'Packages that contain minified code. This may be harmless in some cases where minified code is included in packaged libraries',
    securityCategory: 'Quality',
    severity: 'low',
  },
  ':native': {
    label: 'Native code',
    selector: ':native',
    category: 'pseudo',
    description:
      'Packages that contain native code (e.g., compiled binaries or shared libraries). Including native code can obscure malicious behavior',
    securityCategory: 'Supply Chain',
    severity: 'medium',
  },
  ':network': {
    label: 'Network access',
    selector: ':network',
    category: 'pseudo',
    description: 'Packages that access the network',
    securityCategory: 'Supply Chain',
    severity: 'medium',
  },
  ':obfuscated': {
    label: 'Obfuscated code',
    selector: ':obfuscated',
    category: 'pseudo',
    description:
      'Packages that use obfuscated files, intentionally packed to hide their behavior. This could be a sign of malware',
    securityCategory: 'Supply Chain',
    severity: 'high',
  },
  ':scripts': {
    label: 'Install scripts',
    category: 'pseudo',
    selector: ':scripts',
    description:
      'Packages that have scripts that are run when the package is installed. The majority of malware in npm is hidden in install scripts',
    securityCategory: 'Supply Chain',
    severity: 'medium',
  },
  ':shell': {
    label: 'Shell access',
    category: 'pseudo',
    selector: ':shell',
    description:
      'Packages that accesses the system shell. Accessing the system shell increases the risk of executing arbitrary code',
    securityCategory: 'Supply Chain',
    severity: 'medium',
  },
  ':shrinkwrap': {
    label: 'Shrinkwrap packages',
    category: 'pseudo',
    selector: ':shrinkwrap',
    description:
      'Packages that contains a shrinkwrap file. This may allow the package to bypass normal install procedures',
    securityCategory: 'Supply Chain',
    severity: 'high',
  },
  ':squat': {
    label: 'Typosquats',
    category: 'pseudo',
    selector: ':squat(<severity>)',
    description:
      'Packages with names similar to other popular packages and may not be the package you want',
    securityCategory: 'Supply Chain',
    arguments: [
      {
        label: 'Medium severity',
        category: 'tag',
        argument: 'medium',
        description:
          'AI has identified this package as a potential typosquat of a more popular package. This suggests that the package may be intentionally mimicking another packages name, description, or other metadata',
        severity: 'medium',
      },
      {
        label: 'Critical severity',
        category: 'tag',
        argument: 'critical',
        description:
          'Packages with names similar to other popular packages and may not be the package you want',
        severity: 'critical',
      },
    ],
  },
  ':suspicious': {
    label: 'Suspicious packages',
    selector: ':suspicious()',
    category: 'pseudo',
    description:
      'Packages that may have its GitHub repository artificially inflated with stars (from bots, crowdsourcing, etc.)',
    securityCategory: 'Supply Chain',
    severity: 'high',
  },
  ':tracker': {
    label: 'Telemetry',
    selector: ':tracker()',
    category: 'pseudo',
    description:
      'Packages that contains telemetry which tracks how it is used',
    securityCategory: 'Supply Chain',
    severity: 'high',
  },
  ':trivial': {
    label: 'Trivial packages',
    selector: ':trivial()',
    category: 'pseudo',
    description:
      'Packages that have less than 10 lines of code. These packages are easily copied into your own project and may not warrant the additional supply chain risk of an external dependency',
    securityCategory: 'Supply Chain',
    severity: 'medium',
  },
  ':undesirable': {
    label: 'Undesirable packages',
    selector: ':undesirable()',
    category: 'pseudo',
    description:
      'Packages that are a joke, parody, or includes undocumented or hidden behavior unrelated to its primary function',
    securityCategory: 'Supply Chain',
    severity: 'high',
  },
  ':unknown': {
    label: 'New npm collaborator',
    selector: ':unknown()',
    category: 'pseudo',
    description:
      'Packages that have a new npm collaborator publishing a version of the package for the first time. New collaborators are usually benign additions to a project, but do indicate a change to the security surface area of a package',
    securityCategory: 'Supply Chain',
    severity: 'low',
  },
  ':unmaintained': {
    label: 'Unmaintained packages',
    selector: ':unmaintained()',
    category: 'pseudo',
    description:
      'Packages that have not been updated in more than 5 years and may be unmaintained',
    securityCategory: 'Maintenance',
    severity: 'low',
  },
  ':unpopular': {
    label: 'Unpopular packages',
    selector: ':unpopular()',
    category: 'pseudo',
    description: 'Packages that are not very popular',
    securityCategory: 'Quality',
    severity: 'medium',
  },
  ':unstable': {
    label: 'Unstable ownership',
    selector: ':unstable()',
    category: 'pseudo',
    description:
      'Packages with unstable ownership. This indicates a new collaborator has begun publishing package versions. Package stability and security risk may be elevated',
    securityCategory: 'Supply Chain',
    severity: 'high',
  },
} as const satisfies Record<string, Selector>

export const PSEUDO_STATE_SELECTORS = {
  ':scope': {
    selector: ':scope',
    label: 'The scope of the current selector',
    category: 'pseudo',
    description: 'Returns the current scope of a given selector.',
  },
  ':empty': {
    selector: ':empty',
    label: 'Packages with no dependencies',
    category: 'pseudo',
    description:
      'Matches packages that have no dependencies installed.',
  },
  ':outdated': {
    selector: ':outdated(<type>)',
    label: 'Packages that are outdated',
    category: 'pseudo',
    arguments: [
      {
        argument: 'any',
        category: 'tag',
        label: 'Outdated on any level',
        description:
          'A version exists that is greater than the current one.',
      },
      {
        argument: 'major',
        category: 'tag',
        label: 'Only major versions',
        description:
          'A version exists that is greater than the current one on a major level.',
      },
      {
        argument: 'minor',
        category: 'tag',
        label: 'Only minor versions',
        description:
          'A version exists that is greater than the current one on a minor level.',
      },
      {
        argument: 'patch',
        category: 'tag',
        label: 'Only patch versions',
        description:
          'A version exists that is greater than the current one on a patch level.',
      },
      {
        argument: 'out-of-range',
        category: 'tag',
        label: 'Out of range',
        description:
          'A version exists that is greater than the current one, does not satisfy at least one of its parent’s dependencies.',
      },
      {
        argument: 'in-range',
        category: 'tag',
        label: 'In range',
        description:
          'A version exists that is greater than the current one, and satisfies at least one if its parent’s dependencies.',
      },
    ],
    description:
      'Matches packages that are outdated. The type parameter is optional and can be one of: any (default), in-range, out-of-range, major, minor, patch.',
  },
  ':private': {
    selector: ':private',
    label: 'Packages that are private',
    category: 'pseudo',
    description:
      'Matches packages that have the property private set in their package.json file.',
  },
  ':semver': {
    selector: ':semver(<value>, <function>)',
    label: 'Packages matching a semver value',
    category: 'pseudo',
    arguments: [
      {
        argumentType: 'input',
        category: 'tag',
        argument: 'version',
        label: 'Version',
        description:
          'The semver value to match against, e.g., ^1.0.0',
        operators: SEMVER_OPERATORS,
      },
    ],
    description:
      'Matches packages based on a semver value, e.g., :semver(^1.0.0) to retrieve packages that match the semver. You can also specify a comparison function (e.g., eq, neq, gt) and an optional custom attribute to compare against.',
  },
  ':type': {
    selector: ':type(<type>)',
    label: 'Package type',
    category: 'pseudo',
    arguments: [
      {
        argument: 'registry',
        category: 'tag',
        label: 'Registry',
        description:
          'Matches packages that are hosted on a registry.',
      },
      {
        argument: 'file',
        category: 'tag',
        label: 'File',
        description: 'Matches packages that are local files.',
      },
      {
        argument: 'git',
        category: 'tag',
        label: 'Git',
        description:
          'Matches packages that are hosted on a git repository.',
      },
      {
        argument: 'remote',
        category: 'tag',
        label: 'Remote',
        description:
          'Matches packages that are hosted on a remote server.',
      },
      {
        argument: 'workspace',
        category: 'tag',
        label: 'Workspace',
        description: 'Matches packages that are part of a workspace.',
      },
    ],
    description:
      'Matches packages based on their type, e.g., :type(git) to retrieve all git dependencies.',
  },
  ':published': {
    selector: ':published(<operator>, <date>)',
    label: 'Package publish date',
    arguments: [
      {
        argument: 'date',
        argumentType: 'date',
        category: 'string',
        label: 'Date',
        operators: PUBLISHED_OPERATORS,
        description:
          'The date to compare against, in ISO format (YYYY-MM-DD).',
      },
    ],
    category: 'pseudo',
    description:
      'Matches packages based on their published date. The operator can be one of: >, >=, <, <=, =, !=. The date must be in ISO format (YYYY-MM-DD).',
  },
  ':score': {
    selector: ':score(<rate>, <kind>)',
    label: 'Package insight score',
    category: 'pseudo',
    arguments: [
      {
        argumentType: 'input',
        argument: 'overall',
        category: 'string',
        label: 'Overall',
        description: 'The overall score',
        operators: SCORE_OPERATORS,
      },
      {
        argumentType: 'input',
        category: 'string',
        argument: 'maintenance',
        label: 'Maintenance',
        description: 'The maintenance score',
        operators: SCORE_OPERATORS,
      },
      {
        argumentType: 'input',
        category: 'string',
        argument: 'quality',
        label: 'Quality',
        description: 'The quality score',
        operators: SCORE_OPERATORS,
      },
      {
        argumentType: 'input',
        category: 'string',
        argument: 'supply chain',
        label: 'Supply Chain',
        description: 'The supply chain score',
        operators: SCORE_OPERATORS,
      },
      {
        argumentType: 'input',
        category: 'string',
        argument: 'license',
        label: 'License',
        description: 'The license score',
        operators: SCORE_OPERATORS,
      },
      {
        argumentType: 'input',
        category: 'string',
        argument: 'vulnerability',
        label: 'Vulnerability',
        description: 'The vulnerability score',
        operators: SCORE_OPERATORS,
      },
    ],
    description:
      'Matches packages based on the scores rated found in the insights data, e.g., :score("<=0.5", "maintenance") to match a maintenance score of 0.5 or less.',
  },
} as const satisfies Record<string, Selector>

export const ID_SELECTORS = {
  '#foo': {
    selector: '#foo',
    category: 'id',
    description:
      'Identifiers are a shortcut to retrieving packages by name, unfortunately this shortcut only works for unscoped packages. It’s advised to rely on using Attribute selectors instead. e.g: #foo is the same as [name=foo].',
  },
} as const satisfies Record<string, Selector>
