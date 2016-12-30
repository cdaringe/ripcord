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
 * flatten deps and devDep into key:value pairs where key ~= name;version.
 * this function is atrocious. it should be ashamed of itself. and me! i'm sorry,
 * other guy/girl.
 * @param {any} pkgs
 * @returns {any} flatSet new set
 */
export function flattenPkgs ({ pkgs, flatSet, root }): IPkgSet {
    flatSet = flatSet || {}
    if (!pkgs) return flatSet
    if (pkgs.__ripcordFlatSet) return pkgs.__ripcordFlatSet // @HACK, is flatSet already
    for (let pkgName in pkgs) {
      if (pkgName.indexOf(';') > -1) return pkgs // @HACK, is flatSet already
      const pkg = pkgs[pkgName]
      let directConsumer = null
      let consumerTaggedRequestedVersion = null
      if (pkg.from) directConsumer = pkg.from[pkg.from.length - 2]
      if (pkg.requestedVersion) consumerTaggedRequestedVersion = `${pkg.requestedVersion} (${directConsumer})`
      const _key = key(pkg)
      const flatPkg = flatSet[_key]
      /* istanbul ignore else */
      if (!flatPkg) {
        // do the flattening!
        const tPkg = clone(pkg)
        if (tPkg.requestedVersion) tPkg.requestedVersion = consumerTaggedRequestedVersion
        if (tPkg.from) tPkg.from = tPkg.from.join('>')
        flatSet[_key] = tPkg
        delete tPkg.dependencies
      } else if (!flatPkg._ripcord_hasBeenAddedAsSecondary) {
        flatPkg.author = flatPkg.author || pkg.author
        // ^^ HACK @TODO FIGURE IT OUT
        // add additional from reference, as this pkg was depended on from multiple parents
        if (flatPkg.from) flatPkg.from = `${flatPkg.from}; ${pkg.from.join('>')}`
        if (flatPkg.requestedVersion) flatPkg.requestedVersion = `${consumerTaggedRequestedVersion}; ${flatPkg.requestedVersion}`
        flatPkg._ripcord_hasBeenAddedAsSecondary = true
      }
      flattenPkgs({ pkgs: pkg.dependencies, flatSet, root: false })
    }
    if (root) {
      for (let key in flatSet) {
        let pkg = flatSet[key]
        delete pkg._ripcord_hasBeenAddedAsSecondary
      }
      if (!pkgs.__ripcordFlatSet) {
        Object.defineProperty(pkgs, '__ripcordFlatSet', {
          set () { return },
          get () { return flatSet },
          enumerable: false
        })
      }
    }
    return flatSet
  }

export function key (pkg: IPkg) { return `${pkg.name};${pkg.version}` }
