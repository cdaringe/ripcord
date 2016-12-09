const { clone, values } = require('lodash')

export interface IPkg {
  author: any
  dependencies?: IPkgSet
  from: Array<String>
  // devDependencies isn't a thing™. see `.production` attribute
  license?: string
  licenses: Array<string>
  name: string
  production: Boolean
  requestedVersion?: string
  version: string,

  // states for syncing
  action?: any
  status?: any

  // special fields for licensing logic
  licenseFile?: string
  license1?: string
  license2?: string
  license3?: string
  license4?: string
  license5?: string
  license6?: string
  license7?: string
  license8?: string
  publisher?: any // author, maintainer, maintainers, publisher? get real!
  repository?: any
}

export interface IPkgSet {
  [ key: string ]: IPkg
}

/**
 * flatten deps and devDep into key:value pairs where key ~= name;version
 * @param {any} pkgs
 * @returns {any} flatSet new set
 */
export function flattenPkgs ({ pkgs, flatSet, root }): IPkgSet {
    flatSet = flatSet || {}
    values(pkgs || []).forEach(pkg => {
      const k = key(pkg)
      /* istanbul ignore else */
      if (!flatSet[k]) {
        const tPkg = clone(pkg)
        flatSet[k] = tPkg
        delete tPkg.dependencies
      }
      flattenPkgs({ pkgs: pkg.dependencies, flatSet, root: false })
    })
    return flatSet
  }

export function key (pkg: IPkg) { return `${pkg.name};${pkg.version}` }
