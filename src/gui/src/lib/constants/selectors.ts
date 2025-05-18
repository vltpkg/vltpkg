type SelectorCategory =
  | 'Attribute'
  | 'Class'
  | 'Combinator'
  | 'Pseudo Class'
  | 'Pseudo Element'
  | 'ID'

export interface Selector {
  selector: string
  category: SelectorCategory
  description: string
}

export const ATTRIBUTE_SELECTORS: Record<string, Selector> = {
  '[attr]': {
    selector: '[attr]',
    category: 'Attribute',
    description:
      'Matches elements with an attr property in its package.json.',
  },
  '[attr=value]': {
    selector: '[attr=value]',
    category: 'Attribute',
    description:
      'Matches elements with a property attr whose value is exactly value.',
  },
  '[attr^=value]': {
    selector: '[attr^=value]',
    category: 'Attribute',
    description:
      'Matches elements with a property attr whose value starts with value.',
  },
  '[attr$=value]': {
    selector: '[attr$=value]',
    category: 'Attribute',
    description:
      'Matches elements with a property attr whose value ends with value.',
  },
  '[attr~=value]': {
    selector: '[attr~=value]',
    category: 'Attribute',
    description:
      'Matches elements with a property attr whose value is a whitespace-separated list of words, one of which is exactly value.',
  },
  '[attr|=value]': {
    selector: '[attr|=value]',
    category: 'Attribute',
    description:
      'Matches elements with a property attr whose value is either value or starts with value-.',
  },
  '[attr*=value]': {
    selector: '[attr*=value]',
    category: 'Attribute',
    description:
      'Matches elements with a property attr whose value contains value.',
  },
  '[attr=value i]': {
    selector: '[attr=value i]',
    category: 'Attribute',
    description:
      'Case-insensitive flag, setting it will cause any comparison to be case-insensitive.',
  },
  '[attr=value s]': {
    selector: '[attr=value s]',
    category: 'Attribute',
    description:
      'Case-sensitive flag, setting it will cause comparisons to be case-sensitive, this is the default behavior.',
  },
}

export const CLASS_SELECTORS: Record<string, Selector> = {
  '.prod': {
    selector: '.prod',
    category: 'Class',
    description: 'Matches prod dependencies to your current project.',
  },
  '.dev': {
    selector: '.dev',
    category: 'Class',
    description:
      'Matches packages that are only used as dev dependencies in your current project.',
  },
  '.optional': {
    selector: '.optional',
    category: 'Class',
    description:
      'Matches packages that are optional to your current project.',
  },
  '.peer': {
    selector: '.peer',
    category: 'Class',
    description: 'Matches peer dependencies to your current project.',
  },
  '.workspace': {
    selector: '.workspace',
    category: 'Class',
    description:
      'Matches the current project workspaces (listed in your vlt.json file).',
  },
}

export const COMBINATOR_SELECTORS: Record<string, Selector> = {
  '>': {
    selector: '>',
    category: 'Combinator',
    description:
      'Child combinator, matches packages that are direct dependencies of the previously selected nodes.',
  },
  ' ': {
    selector: '" "',
    category: 'Combinator',
    description:
      'Descendant combinator, matches all packages that are direct & transitive dependencies of the previously selected nodes.',
  },
  '~': {
    selector: '~',
    category: 'Combinator',
    description:
      'Sibling combinator, matches packages that are direct dependencies of all dependents of the previously selected nodes.',
  },
}

export const PSEUDO_CLASS_SELECTORS: Record<string, Selector> = {
  ':attr(key, [attr=value])': {
    selector: ':attr(key, [attr=value])',
    category: 'Pseudo Class',
    description:
      'The attribute pseudo-class allows for selecting packages based on nested properties of its package.json metadata. As an example, here is a query that filters only packages that declare an optional peer dependency named foo: :attr(peerDependenciesMeta, foo, [optional=true])',
  },
  ':empty': {
    selector: ':empty',
    category: 'Pseudo Class',
    description:
      'Matches packages that have no dependencies installed.',
  },
  ':has(<selector-list>)': {
    selector: ':has(<selector-list>)',
    category: 'Pseudo Class',
    description:
      'Matches only packages that have valid results for the selector expression used. For example, :has(.peer[name=react]) matches packages with a peer dependency on react.',
  },
  ':is(<forgiving-selector-list>)': {
    selector: ':is(<forgiving-selector-list>)',
    category: 'Pseudo Class',
    description:
      'Useful for writing large selectors in a more compact form. It takes a selector list as its arguments and selects any element that can be selected by one of the selectors in that list. It behaves forgivingly, ignoring non-existing ids, classes, combinators, operators, and pseudo-selectors.',
  },
  ':not(<selector-list>)': {
    selector: ':not(<selector-list>)',
    category: 'Pseudo Class',
    description:
      'Negation pseudo-class, selects packages that do not match a list of selectors.',
  },
  ':outdated(<type>)': {
    selector: ':outdated(<type>)',
    category: 'Pseudo Class',
    description:
      'Matches packages that are outdated. The type parameter is optional and can be one of: any (default), in-range, out-of-range, major, minor, patch.',
  },
  ':private': {
    selector: ':private',
    category: 'Pseudo Class',
    description:
      'Matches packages that have the property private set in their package.json file.',
  },
  ':semver(<value>, <function>, <custom-attribute-selector>)': {
    selector:
      ':semver(<value>, <function>, <custom-attribute-selector>)',
    category: 'Pseudo Class',
    description:
      'Matches packages based on a semver value, e.g., :semver(^1.0.0) to retrieve packages that match the semver. You can also specify a comparison function (e.g., eq, neq, gt) and an optional custom attribute to compare against.',
  },
  ':type(registry|file|git|remote|workspace)': {
    selector: ':type(registry|file|git|remote|workspace)',
    category: 'Pseudo Class',
    description:
      'Matches packages based on their type, e.g., :type(git) to retrieve all git dependencies.',
  },
  ':published("<date>")': {
    selector: ':published("<operator>, <date>")',
    category: 'Pseudo Class',
    description:
      'Matches packages based on their published date. The operator can be one of: >, >=, <, <=, =, !=. The date must be in ISO format (YYYY-MM-DD).',
  },
  ':score': {
    selector: ':score("<rate>, [kind]")',
    category: 'Pseudo Class',
    description:
      'Matches packages based on the scores rated found in the insights data, e.g., :score("<=0.5", "maintenance") to match a maintenance score of 0.5 or less.',
  },
}

export const PSEUDO_ELEMENT_SELECTORS: Record<string, Selector> = {
  ':project': {
    selector: ':project',
    category: 'Pseudo Element',
    description:
      'Returns both the root node (as defined below) along with any workspace declared in your project.',
  },
  ':root': {
    selector: ':root',
    category: 'Pseudo Element',
    description:
      'Returns the root node, that represents the package defined at the top-level package.json of your project folder.',
  },
  ':scope': {
    selector: ':scope',
    category: 'Pseudo Element',
    description: 'Returns the current scope of a given selector.',
  },
}

export const ID_SELECTORS: Record<string, Selector> = {
  '#foo': {
    selector: '#foo',
    category: 'ID',
    description:
      'Identifiers are a shortcut to retrieving packages by name, unfortunately this shortcut only works for unscoped packages. It’s advised to rely on using Attribute selectors instead. e.g: #foo is the same as [name=foo].',
  },
}
