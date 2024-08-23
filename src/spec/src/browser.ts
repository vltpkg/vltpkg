import { SpecLike, SpecOptionsFilled } from './types.js'
export * from './types.js'

/**
 * Very simplistic isomorphic Spec implementation that transforms
 * name + bareSpec + type values into a conforming {@link SpecLike} object.
 */
export class Spec implements SpecLike<Spec> {
  static parse(name: string, bareSpec: string, type: Spec['type']) {
    return new Spec(name, bareSpec, type)
  }
  spec: string
  name: string
  bareSpec: string
  options: SpecOptionsFilled
  type: SpecLike<Spec>['type']
  final: Spec
  constructor(name: string, bareSpec: string, type: Spec['type']) {
    this.spec = `${name}@${bareSpec}`
    this.name = name
    this.bareSpec = bareSpec
    this.options = {
      registry: '',
      registries: {},
      'git-hosts': {},
      'git-host-archives': {},
      'scope-registries': {},
    }
    this.type = type
    this.final = this
  }
}
