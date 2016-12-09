export interface ISnykPkgSet {
  [ key: string ]: ISnykPkg
}

// @TODO should we let this have extraneous attrs, given `extraFields` is a thing™
// in the resolveDeps(...) request?
export interface ISnykPkg {
  __filename: string
  author?: any
  dep: string // e.g ^0.x. poorly named :/
  dependencies: ISnykPkgSet
  depType: string // prod/dev/extraneious
  from: Array<string>
  full: string // full declaration. e.g. `@semantic-release/condition-codeship@0.0.1
  license?: string
  maintainer?: any
  maintainers?: Array<any>
  name: string
  snyk: string
  valid: boolean
  version: string
}
