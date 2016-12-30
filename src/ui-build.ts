import { IPkg, IPkgSet, flattenPkgs, key } from './model/pkg'
const path = require('path')
const pify = require('pify')
const { uniqBy, values, keyBy, set, forEach } = require('lodash')
const readPkgUp = require('read-pkg-up')
const bb = require('bluebird')
const logger = require('./logger')
const counsel = require('counsel')

module.exports = {

  /**
   * If UI build detected, filter out all unused production deps from our
   * license report. Futher, because UI builds often inject undeclared dependencies
   * to support the bundle runtime, classify those as production.
   * @note
   * @param {object} opts
   * @param {object|null} opts.pkgs packages
   * @param {object|null} opts.opts cli opts
   * @param {boolean} [opts.opts.retainUnused]
   * @returns {object} pkgs
   */
  applyWebBuildTransform (pkgs : IPkgSet, opts : any) {
    opts = opts || {}
    const flatPkgs = flattenPkgs({ pkgs, flatSet: null, root: true })
    const hasUiBuild = this.hasUiBuild(flatPkgs, opts)
    if (!hasUiBuild) return Promise.resolve(pkgs)
    return this.getWebpackDeps(opts)
    .then(wpDeps => {
      logger.verbose('transforming native build to web-build')
      const flatPkgValues = values(flatPkgs)
      flatPkgValues.forEach(pkg => pkg.production = false) // production is flagged by ui built pkgs _only_
      const flatPkgsByKey = keyBy(flatPkgValues, key) // our critical set!
      const wpDepsByKey = keyBy(wpDeps, key)
      // mark all included deps as production
      for (let wpKey in wpDepsByKey) {
        let pkg = flatPkgsByKey[wpKey]
        if (pkg) {
          pkg.production = true
          flatPkgsByKey[wpKey] = pkg
        }
      }
      // remove production dependencies that were _not_ bundled
      const flatProdPkgsByKey = keyBy(flatPkgValues.filter(p => p.production), key)
      for (let prodKey in flatProdPkgsByKey) {
        let prdPkg = flatProdPkgsByKey[prodKey]
        delete flatPkgsByKey[prodKey].dependencies // all deps now how an explicity entry, so don't nest
        if (!wpDepsByKey[prodKey]) {
          if (opts.retainUnused) {
            set(flatProdPkgsByKey, `_unusedPkgs.${prodKey}`, prdPkg)
          } else {
            delete flatPkgsByKey[prodKey]
          }
        }
      }
      return flatPkgsByKey
    })
  },

  /**
   * Get babel configuration.  Support `webpack.config.babel.js`, against my
   * better judgement!
   * @param {string} configFilename
   * @returns {object}
   */
  _getBabelConfig (configFilename : string) {
    let config
    /* istanbul ignore next */
    try {
      return require(configFilename) // how offensive!
    } catch (err) {
      if (err instanceof Error && err.message.match('Unexpected token import')) {
        logger.warn('es6 webpack config found. attempting babel-register')
        try {
          require('babel-register')
          return require(configFilename)
        } catch (err) {
          if (err instanceof Error && err.message.match('Cannot find')) {
            logger.warn('...babel-register not found')
            const coreRegister = path.join(counsel.targetProjectRoot, 'node_modules', 'babel-core', 'register.js')
            logger.warn('...attempting babel-core/register', coreRegister)
            require(coreRegister)
            return require(configFilename)
          }
          throw err
        }
      }
      throw err
    }
  },

  /**
   * get dependencies used during webpack compile
   * @param {any} opts
   * @returns {Promise} Promise<object>
   */
  getWebpackDeps (opts) {
    let configFilename = null
    let config = null
    opts = opts || {}
    if (!opts.webpackConfig) {
      throw new Error([
        'a webpack dependency has been detected in your build, but no config provided.',
        'please specify a webpack config to build against using',
        '--webpack-config such that `ripcord licenses` can detect exactly',
        'which production dependencies will be bundled.'
      ].join(' '))
    }
    configFilename = path.isAbsolute(opts.webpackConfig)
      ? opts.webpackConfig
      : path.resolve(process.cwd(), opts.webpackConfig)
    config = this._getBabelConfig(configFilename)
    return this._getWebpackedNodeModules({
      webpackDir: counsel.targetProjectRoot,
      webpackConfig: config
    })
   },

  /**
   * gets corresponding package.json's in pojo form for each explicit filenames
   * provided
   * @note likely major perf boost would be memoizing readPkgUp's internals
   * @param {string[]} filenames
   * @returns {Promise} resolves to { requestedFilename: string, package: { ... } }
   */
  _getUpstreamPackageJsons (filenames) {
    const bundledRequestAndPkg = function (filename) {
      return readPkgUp({ cwd: filename })
      .then(function extraPackageJsons(res) {
        return { request: filename, pkg: res.pkg, pkgJsonFilename: res.path }
      })
    }
    return bb.map(filenames, bundledRequestAndPkg, { concurrency: 20 })
  },

  /**
   * @private
   * @description gets node_modules dependencies used by webpack build
   * @param {any} { webpackDir, webpackConfig }
   * @returns {Promise} Promise<any>
   */
  _getWebpackedNodeModules ({ webpackDir, webpackConfig }) {
    const webpackPath = path.join(counsel.targetProjectRoot, 'node_modules', 'webpack')
    const wp = require(webpackPath) // naughty daddy...
    const wpJsonProfileConfig = Object.assign(webpackConfig, { profile: true, json: true })
    // ^^ --json & --profile config options enable easy parsing of bundled packages
    logger.verbose('compiling webpack project')
    return pify(wp)(wpJsonProfileConfig)
    .then(stats =>  this._wpStatsToPkgMeta({ stats, webpackDir, webpackPath }))
    .then(pkgReqs =>  this._wpPkgMetaToBundleSet(pkgReqs))
    .catch(err => {
      if (err instanceof Error) throw err
      if (typeof err === 'string') {
        throw new Error([
          `webpack error: ${err}.`,
          'webpack periodically throws strings, hence, a full stack is not',
          'avaliable at this time. this error is known to happen when',
          '`npm install` and `webpack` are run with different `NODE_ENV`',
          'environment variables specified'
        ].join(' '))
      }
      console.error([
        'a webpack compile time error has occurred.',
        'webpack plugins may occasionally throw non-Error instances, and',
        'something other than an Error has been thrown.  apologies that we cannot',
        'provide any more helpful information.'
      ].join(' '))
      throw err
    })
  },

  /**
   * returns absolute pathed filenames of webpacked files under node_modules
   * @param {any} modules
   * @returns {string[]} absolute pathed filenames
   */
  _getWebpackedNodeModulesFilenames ({ modules, webpackDir }) {
    const wpSep = `${path.sep}~${path.sep}`
    const wpNm = `${path.sep}node_modules${path.sep}`
    return modules
    .filter(pkg => pkg.name.match('~'))
    .map(pkg => {
      let relRoot = pkg.name.substr(pkg.name.indexOf(wpSep) + 3)
      while (relRoot.indexOf(wpSep) >= 0) relRoot = relRoot.replace(wpSep, wpNm)
      return relRoot
    })
    .map(assetRelativePath => {
      return path.resolve(webpackDir, 'node_modules', assetRelativePath)
    })
  },


  /**
   * determines if this package's artifact is a ui build
   * @param {any} pkgs
   * @returns {boolean} hasUiBuild
   */
  hasUiBuild (pkgs : IPkgSet, opts) {
    const hasUIBuildConfig = !!(opts.webpackConfig || opts.someOtherUiBuildToolConfig)
    let hasUIBuildTool = false
    for (let pkgName in pkgs) {
      if (pkgName.match(/webpack/) || pkgName.match(/someOtherUiBuildTool/)) {
        hasUIBuildTool = true
        break
      }
    }
    if (opts.uiBuild === false) return false
    if (hasUIBuildTool) {
      if (!hasUIBuildConfig) {
        throw new Error([
          '🚨  ui build tool detected, but no UI build configuration specified.  if you',
          'intended to analyze dependencies from a ui build process, please supply',
          'a build config path, (e.g. --webpack-config), otherwise, explicitly',
          'opt-out and analyze dependencies strictly as defined from your',
          'package.json using --no-ui-build  🚨'
        ].join(' '))
      }
      return true
    } else {
      /* istanbul ignore next */
      if (hasUIBuildConfig) {
        throw new Error([
          'build configuration passed, but no UI build tool found!'
        ].join(' '))
      }
    }
    return false
  },

  /**
   * @private
   * @param {any} pkgReqs
   * @returns {object[]}
   */
  _wpPkgMetaToBundleSet (pkgReqs) {
    const bundledNodeModules = pkgReqs.map(pkgReq => {
      const pkg = pkgReq.pkg
      const name = pkg.name
      const version = pkg.version
      return { name, version }
    })
    return uniqBy(bundledNodeModules, pkg => key(pkg))
  },

  /**
   * @private
   * @param {any} stats
   * @returns {Promise}
   */
  _wpStatsToPkgMeta ({ stats, webpackDir, webpackPath }) {
    const modules = stats.toJson().modules
    const packedNodeModuleFilenames = this._getWebpackedNodeModulesFilenames({ modules, webpackDir })
    const packedFilenames = [ webpackPath, ...packedNodeModuleFilenames ]
    // ^ webpack modules.toJson() filters its own injected source. stub it back in
    return this._getUpstreamPackageJsons(packedFilenames)
  },

  /**
   * @deprecated
   * @description leaving due to pkg ALPHA status
   * @private
   * @param {string} namePath
   * @returns {string} package name
   */
  _extractWebpackNodeModulePackageName (namePath) {
    /* istanbul ignore next */
    return (function () {
      if (!namePath) throw new Error('missing name path')
      const nodeModulesNdx = namePath.lastIndexOf('node_modules')
      const tildaNdx = namePath.indexOf('~')
      let pkgNameStartNdx = null
      let pkgName
      if (nodeModulesNdx > 0) {
        pkgNameStartNdx = nodeModulesNdx + 'node_modules'.length + path.sep.length
      } else if (tildaNdx > 0) {
        pkgNameStartNdx = tildaNdx + path.sep.length + 1
      } else {
        throw new Error(`unable to find pkg name: ${namePath}`)
      }
      if (!namePath.charAt(pkgNameStartNdx)) throw new Error('unable to find pkg name')
      const namePathLTrimmed = namePath.substr(pkgNameStartNdx)
      if (namePathLTrimmed.charAt(0) === '@') {
        // handle scoped packages!
        const scopedPtn = `^@[^${path.sep}]*\\${path.sep}[^${path.sep}]*`
        const scopedPkgNameRgx = new RegExp(scopedPtn)
        // ^^ @beep/bop, in a x-platform friendly way
        try {
          pkgName = namePathLTrimmed.match(scopedPkgNameRgx)[0]
        } catch (err) {
          throw new Error(`unable to extract package name from: ${namePath}`)
        }
      } else {
        const pkgNameRgx = new RegExp(`([^${path.sep}]*)${path.sep}?`)
        try {
          pkgName = namePathLTrimmed.match(pkgNameRgx)[1]
        } catch (err) {
          throw new Error(`unable to extract package name from: ${namePath}`)
        }
      }
      if (!pkgName) throw new Error(`unable to extract package name from: ${namePath}`)
      return pkgName
    })()
  }
}
