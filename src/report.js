'use strict'

const counsel = require('counsel')
const resolveDeps = require('snyk-resolve-deps')

module.exports = {
  generate (action, opts) {
    const prd = {}
    const dev = {}
    const rptPkg = counsel.targetProjectPackageJson
    /* istanbul ignore next */
    if (!rptPkg.name || !rptPkg.version) {
      throw new ReferenceError('package name and version required in package.json')
    }
    /* istanbul ignore next */
    if (!rptPkg.license) throw new ReferenceError('package requires a license in package.json')
    return resolveDeps(counsel.targetProjectRoot, { dev: true, extraFields: ['tripwireId'] })
    .then(tree => {
      const deps = tree.dependencies // .dependencies _has_ deps and devDeps
      for (let pkg in deps) {
        if (deps[pkg].depType.match(/prod/)) prd[pkg] = deps[pkg]
        else dev[pkg] = deps[pkg]
      }
      this._simplifyDepStructure(prd)
      this._simplifyDepStructure(dev)
      return {
        package: {
          name: rptPkg.name,
          version: rptPkg.version,
          author: rptPkg.author,
          license: rptPkg.license
        },
        configurations: {
          compile: prd,
          testCompile: dev
        }
      }
    })
  },

  /**
   * mutates the snyk dep report in place to include only a small subset of keys for
   * noise reduction and ease of parsing for people interested in the report.
   * @private
   * @param {object} depSet snyk dep set
   * @returns {undefined}
   */
  _simplifyDepStructure (depSet) {
    for (var pkgName in depSet) {
      var pkg = depSet[pkgName]
      pkg = depSet[pkgName] = {
        'tripwireId': pkg.tripwireId,
        'requestedVersion': pkg.dep,
        'version': pkg.version,
        'dependencies': pkg.dependencies,
        'license': pkg.license
      }
      if (Object.keys(pkg.dependencies).length) this._simplifyDepStructure(pkg.dependencies)
      else delete pkg.dependencies
    }
  }

}
