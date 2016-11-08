/**
 * @private
 * @module sync-packages-to-registry
 * @description syncs packages from one npm artifactory registry to another
 */
'use strict'

const STATUS_NOT_EXISTS = 'STATUS_NOT_EXISTS'
const STATUS_EXISTS = 'STATUS_EXISTS'
const STATUS_INVALID_RESOLVE_GIT = 'STATUS_INVALID_RESOLVE_GIT'
const STATUS_INVALID_RESOLVE_URI = 'STATUS_INVALID_RESOLVE_URI'
const ACTION_SKIP = 'ACTION_SKIP'
const ACTION_SYNC = 'ACTION_SYNC'

const pify = require('pify')
const npm = require('requireg')('npm')
const request = require('request')

const logger = require('./logger')

module.exports = {
  /**
   * @private
   * @property _destRepoName
   * @description destination repository to copy to. set post `sync()` call
   * @private
   */
  _destRepoName: null,

  /**
   * @private
   */
  _envKeys: [
    '_auth',
    'ARTIFACTORY_URI',
    'NPM_SRC_ARTIFACTORY_URI',
    'NPM_DEST_ARTIFACTORY_URI',
    'NPM_SRC_CACHE_ARTIFACTORY_URI'
  ],

  /**
   * @private
   * @description asserts that npmrc configuration values are in places
   * @returns undefined
   */
  _assertEnv () {
    const missingKeys = this._envKeys.filter(key => !npm.config.get(key))
    if (missingKeys.length) {
      const msgMissingKeys = `.npmrc keys missing: ${missingKeys.join(', ')}`
      logger.error([
        `${msgMissingKeys}\n\n`,
        'to sucessfully copy packages from an external',
        'repository to a local repository, please ensure that the following keys',
        'are set in your npmrc:\n',
        '\t_auth=some-base64-encoded-str\n',
        '\tARTIFACTORY_URI=https://my-artifactory.com/artifactory\n',
        '\tNPM_SRC_ARTIFACTORY_URI=https://my-artifactory.com/artifactory/api/npm/external-npm-repo\n',
        '\tNPM_DEST_ARTIFACTORY_URI=https://my-artifactory.com/artifactory/api/npm/local-npm-repo\n',
        '\tNPM_SRC_CACHE_ARTIFACTORY_URI=https://my-artifactory.com/artifactory/api/npm/registry-cache\n'
      ].join(' '))
      throw new Error(msgMissingKeys)
    }
  },

  /**
   * @private
   * @description copies package from src to dest repo
   * @param {object} pkg
   * @param {string} pkg.name
   * @returns Promise
   */
  _copyPackage (pkg) {
    if (!pkg.artifactoryTarball) {
      throw new ReferenceError('`.tarball` field missing. unable to copy pkg')
    }
    const copyUri = [
      npm.config.get('NPM_SRC_CACHE_ARTIFACTORY_URI'),
      `${pkg.artifactoryTarball}?to=/${this._destRepoName}`,
      pkg.artifactoryTarball
    ].join('/')
    const post = pify(request.post)
    return post(copyUri, this._getRequestHeaders())
    .then(response => {
      /* istanbul ignore next */
      if (response.statusCode !== 200) {
        throw new Error([
          `sync-package [${pkg.name}]: failed to copy.`,
          `unexpected response ${response.statusCode}`
        ].join(' '))
      }
      pkg.status = STATUS_EXISTS
    })
  },

  /**
   * @private
   * @description tags & filters packages for syncing. packages from npm ls are already deduped,
   * but may contain multiple versions
   * @param {object[]} pkgs
   * @returns object[] pkgs
   */
  _tagPackagesToSync (pkgs) {
    const artifactoryUri = npm.config.get('NPM_SRC_ARTIFACTORY_URI')
    const artifactorySrcUri = npm.config.get('NPM_SRC_ARTIFACTORY_URI')
    const unresolved = []
    const gitResolved = []
    const pkgsByKey = {}
    const tagged = pkgs.filter((pkg, ndx) => {
      const resolvedUri = pkg._resolved || ''
      const isResolvedArtifactory = resolvedUri.startsWith(artifactoryUri)
      const isResolvedGithub = !!resolvedUri.match(/github.com/)

      if (!isResolvedArtifactory) {
        if (isResolvedGithub) {
          gitResolved.push(pkg)
          pkg.action = ACTION_SKIP
          pkg.status = STATUS_INVALID_RESOLVE_GIT
        } else {
          pkg.action = ACTION_SKIP
          pkg.status = STATUS_INVALID_RESOLVE_URI
          unresolved.push(pkg)
        }
        return true
      }

      pkg.artifactoryTarball = pkg._resolved.substring(artifactorySrcUri.length)

      // handle collisions
      const existing = !!pkgsByKey[pkg.artifactoryTarball]
      return !existing
    })

    /* istanbul ignore next */
    if (unresolved.length) this._handleUnresolvedPkgs(unresolved)
    /* istanbul ignore next */
    if (gitResolved.length) this._handleGitResolvedPkgs(gitResolved)

    return tagged
  },

  /**
   * @private
   * @description gets package from local repository
   * @param {string} name
   * @returns Promise
   */
  _getLocalPackage (name) {
    const get = pify(request)
    const uri = `${npm.config.get('NPM_SRC_ARTIFACTORY_URI')}/${name}`
    return get(uri, this._getRequestHeaders())
  },

  /**
   * @private
   * @description generates headers for request module
   * @returns object headers for request module
   */
  _getRequestHeaders () {
    return { headers: { Authorization: `Basic ${npm.config.get('_auth')}` }, strictSSL: false }
  },

  /**
   * @private
   * @description logs dryRun if in dryRun mode
   * @param {any} rslt
   * @param {any} pkgs
   * @param {any} opts
   * @returns object[] pkgs
   */
  _handleDryRun (rslt, pkgs, opts) {
    /* istanbul ignore next */
    if (!opts) throw new Error('missing opts 😢')
    if (!opts.dryRun) return pkgs
    /* istanbul ignore next */
    const toSync = pkgs.filter(pkg => pkg.action === ACTION_SYNC).map(pkg => pkg.name)
    /* istanbul ignore next */
    const toSkip = pkgs.filter(pkg => pkg.action === ACTION_SKIP).map(pkg => pkg.name)
    const toSyncTxt = this.setToText({ set: toSync, limit: 10, fn: txt => `\t\t${txt}\n` })
    const toSkipTxt = this.setToText({ set: toSkip, limit: 10, fn: txt => `\t\t${txt}\n` })
    logger.info([
      'sync dry run:\n',
      `\tpackages to sync [${toSync.length}]:\n${toSyncTxt}`,
      `\tpackages to skip [${toSkip.length}]:\n${toSkipTxt}`
    ].join(''))
    return pkgs
  },

  /**
   * convert an array to text.  enables specification of a limit of how many
   * items in the set to convert to text, and truncates in a friendly way,
   * denoting how many items were truncated
   * @param {object} opts
   * @param {array} opts.set
   * @param {number} [opts.limit]
   * @param {function} opts.fn transform function.
   *   convert an array item to text. will be join('')ed with other items
   * @returns string
   */
  setToText ({ set, limit, fn }) {
    /* istanbul ignore next */
    if (!set || !fn) throw new Error('set & limit required')
    limit = limit || 20
    const moreTxt = `...[${set.length - limit} more]`
    return set.length > limit
      ? set.slice(0, limit).map(fn).join('') + fn(moreTxt)
      : set.map(fn).join('')
  },

  /**
   * @private
   * @descrition handle case where packages are resolving from git
   * @param {object[]} pkgs
   */
  _handleGitResolvedPkgs (pkgs) {
    /* istanbul ignore next */
    const names = pkgs.map(p => p.name)
    /* istanbul ignore next */
    let pkgSetText = this.setToText({ set: names, limit: 10, fn: name => `\t${name}\n` })

    /* istanbul ignore next */
    logger.error([
      `attempted to resolve for syncing:\n${pkgSetText}`,
      '\n\n🚧',
      'although npm can resolve git project packages, we have no means to',
      'copy a package tarball from git to npm.  please roll your git dep into a',
      'valid npm package. alternatively, add a `--skip-git-deps` flag to this',
      'project if you would like to proceed knowing the dependency will not',
      'be copied. 🚧'
    ].join(' '))
    /* istanbul ignore next */
    process.exit(1)
  },

  /**
   * @private
   * @descrition handle case where packages have no resolve url
   * @param {object[]} pkgs
   */
  _handleUnresolvedPkgs (pkgs) {
    const names = pkgs.map(p => p.name)
    let pkgSetText = names.length > 10
      ? `${names.slice(0, 10).join(', ')}...[${names.length - 10} more]`
      : names.join(', ')
    logger.warn([
      `packages ${pkgSetText} will not be synced.`,
      `${pkgs.length === 1 ? 'it was' : 'they were'} not resolved`,
      'from a remote repository.'
    ].join(' '))
  },

  /**
   * @private
   * @description loads npm
   * @returns Promise
   */
  _loadNpm () {
    return pify(npm.load)({ progress: false, silent: true })
    // ^^ silent does not silence progress, https://github.com/npm/npm/issues/14413
  },

  /**
   * @private
   * @description set module attrs from environment
   * @returns undefined
   */
  _setLocalsFromEnv () {
    try {
      this._destRepoName = npm.config.get('NPM_DEST_ARTIFACTORY_URI').match(/[^\/]*$/)[0]
    } catch (err) {
      /* istanbul ignore next */
      throw new Error([
        'unable to extract destination repo name from NPM_DEST_ARTIFACTORY_URI:',
        `${npm.config.get('NPM_DEST_ARTIFACTORY_URI') || 'MISSING'}`
      ].join(' '))
    }
  },

  /**
   * sync all 3rd party external to 3rd party local
   * @param {object} opts
   * @param {boolean} opts.dryRun
   * @returns Promise
   */
  sync (opts) {
    opts = opts || {}
    logger.warn([
      '🚨 this feature is untested, use with caution.',
      'npm registries are not yet operational 🚨'
    ].join(' '))
    return this._loadNpm()
    .then(this._assertEnv.bind(this))
    .then(this._setLocalsFromEnv.bind(this))
    .then(this._listPackages.bind(this))
    .then(pkgs => pkgs.map(p => Object.assign(p, { status: null, action: null })))
    .then(this._tagPackagesToSync.bind(this))
    .then(pkgs => this._syncPackages(pkgs, opts))
  },

  /**
   * @private
   * @descrition Sync individual package from src to dest repository
   * @param {object} pkg
   * @param {string} pkg.name
   * @param {Symbol|null} pkg.status
   * @param {Symbol|null} pkg.action
   * @param {object} opts
   * @param {boolean} opts.dryRun
   * @returns Promise
   */
  _syncPackage (pkg, opts) {
    opts = opts || {}
    /* istanbul ignore next */
    if (!pkg || !pkg.name) {
      throw new Error([
        'invalid package provided. this is known to occur when your package',
        'state is invalid.  run `npm ls` and make sure it passes without error.'
      ].join(' '))
    }
    if (pkg.action === ACTION_SKIP) return Promise.resolve()
    /* istanbul ignore next */
    const handleResponse = response => {
      if (response.statusCode === 200) {
        pkg.status = STATUS_EXISTS
        pkg.action = ACTION_SKIP
        return Promise.resolve()
      }
      if (response.statusCode === 404) {
        pkg.action = ACTION_SYNC
        pkg.status = STATUS_NOT_EXISTS
        if (opts.dryRun) return Promise.resolve()
        return this._copyPackage(pkg)
      }
      throw new Error(`sync-package [${pkg.name}]: unexpected response ${response.statusCode}`)
    }
    return this._getLocalPackage(pkg.name)
    .then(handleResponse.bind(this))
  },

  /**
   * @private
   * @description Sync all packages.  Packages are synchronized sequentially.
   * @TODO consider blasting the artifactory API by doing a Promise.all(...)
   * vs. chaining each sync together
   * @param {string[]} pkgs
   * @param {object} opts
   * @param {boolean} opts.dryRun
   * @returns Promise resolves when all packages synced
   */
  _syncPackages (pkgs, opts) {
    opts = opts || {}
    logger.progressMode = true
    return pkgs.reduce(
      (chain, pkg, ndx) => {
        // chain each package copy so as to not flood the src/dest npm registries.
        // this strategy copies each package serially, vs in parallel
        return chain.then(() => {
          logger.verbose(`syncing package (${ndx + 1}/${pkgs.length}): ${pkg.name}`)
          return this._syncPackage(pkg, opts)
        })
      },
      Promise.resolve()
    )
    .then(() => {
      logger.verbose(`syncing packages: complete\n`)
      logger.progressMode = false
    })
    .then(r => this._handleDryRun(r, pkgs, opts))
  },

  /**
   * @private
   * @description npm ls call. get all package deps
   * @returns Promise
   */
  _listPackages () {
    const ls = pify(npm.commands.ls)
    return ls(null, true)
    .then(pkg => {
      let pkgs = this._buildFlatDeps({ pkgs: [], pkg, isTopLevel: true })
      return pkgs
    })
  },

  /**
   * @private
   * @description Build set of all dependencies (+devDeps).  Set consists of just package names
   * @warning set is volatile and modified on each call
   * @param {object} opts
   * @param {Set} opts.pkgs set of package names (volatile)
   * @param {object} opts.pkg parsed package.json
   * @param {object} opts.isTopLevel top-level package flag
   * @returns undefined
   */
  _buildFlatDeps ({ pkgs, pkg, isTopLevel }) {
    if (!isTopLevel) pkgs.push(pkg)
    if (pkg.dependencies) {
      const dependencies = pkg.dependencies
      for (const name in dependencies) {
        this._buildFlatDeps({ pkgs, pkg: dependencies[name] })
      }
    }
    return pkgs
  }

}
