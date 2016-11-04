'use strict'

const counsel = require('counsel')
const pify = require('pify')
const checker = pify(require('license-checker'))
const logger = require('./logger')
const fs = require('fs')
const json2csv = require('json2csv')
const values = require('lodash.values')

const WHITELIST = [
  'MIT',
  'MIT*',
  'BSD',
  'ISC'
]

module.exports = {
  _appendFields ({ pkgs, production }) {
    if (!pkgs || !Object.keys(pkgs).length) return pkgs
    for (let nameVersion in pkgs) {
      const pkg = pkgs[nameVersion]

      // tidy name, version
      const components = nameVersion.match(/(.*)@(.*)/)
      const name = components[1]
      const version = components[2]

      // tidy publisher
      if (Array.isArray(pkg.publisher)) pkg.publisher = pkg.publisher.join(';')

      // split licenses to n-license fields
      const licenseKVs = typeof pkg.licenses === 'string'
        ? { 'license1': pkg.licenses }
        : pkg.licenses.reduce((set, l, ndx) => Object.assign(set, { [`license${ndx + 1}`]: l }), {})
      Object.assign(pkg, { name, version, production: production.toString() }, licenseKVs)
      delete pkg.licenses

      // purge commas to assert well behaved csv
      for (var field in pkg) {
        pkg[field] = pkg[field].replace(/,/g, ';')
      }
    }
    return pkgs
  },

  getLicenses (configOverride, opts, ripcord) {
    configOverride = configOverride || {}
    return this._getLicenses(configOverride)
    .then(prdPkgs => {
      if (!opts.dev) return prdPkgs
      const devOverride = Object.assign(configOverride, { production: false, development: true })
      return this._getLicenses(devOverride)
      .then(devPkgs => Object.assign(devPkgs, prdPkgs))
    })
    .then(pkgs => {
      // scrap current package from report
      const pkg = counsel.targetProjectPackageJson
      const nameAtVersion = `${pkg.name}@${pkg.version}`
      delete pkgs[nameAtVersion]
      return pkgs
    })
  },

  _getLicenses (configOverride, opts) {
    const projectRoot = counsel.targetProjectRoot
    const DEFAULT_CONFIG = {
      start: projectRoot,
      exclude: WHITELIST.join(',')
    }
    const config = Object.assign(DEFAULT_CONFIG, { production: true }, configOverride)
    return checker.init(config)
    .then(pkgs => this._appendFields({ pkgs, production: !!config.production }))
  },

  _handleGetLicensesCheck (pkgs, opts, ripcord) {
    const pkg = counsel.targetProjectPackageJson
    if (!Object.keys(pkgs).length) return
    const errMsg = `${pkg.name} has unapproved licenses`
    const rptText = opts.csv ? this._reportToCSV(pkgs) : JSON.stringify(pkgs, null, 2)
    if (opts.output) {
      this._writeReport(Object.assign(
        { txt: rptText, basename: 'license-check', ripcord },
        opts
      ))
    } else {
      logger.error(`${errMsg}:\n`)
      logger.error(rptText) // stream report to stderr
    }
    if (opts.throwOnFail) throw new Error(errMsg)
    process.exit(1)
  },

  /**
   * check target project for valid licenses.
   * on invalid licenses, generate a report
   * @param {object} opts
   * @param {string} opts.output filename, dirname (relative or absolute)
   * @param {boolean} opts.csv output file in csv mode (otherwise json)
   * @param {boolean} opts.throwOnFail throws, vs process.exit(1) on fail. hook for testing.
   * @param {module} ripcord
   * @returns Promise
   */
  check (opts, ripcord) {
    const pkg = counsel.targetProjectPackageJson
    const isDevOnly = pkg[counsel.configKey].devOnly
    if (isDevOnly && !opts.force) {
      logger.info('devOnly, waiving license check')
      return Promise.resolve()
    }
    return this.getLicenses(null, opts, ripcord)
    .then(pkgs => this._handleGetLicensesCheck(pkgs, opts, ripcord))
  },

  dump (opts, ripcord) {
    return this.getLicenses({ exclude: null }, opts, ripcord)
    .then((pkgs) => {
      if (!Object.keys(pkgs).length) return
      const dumpTxt = opts.csv ? this._reportToCSV(pkgs) : JSON.stringify(pkgs, null, 2)
      if (opts.output) {
        this._writeReport(Object.assign(
          { txt: dumpTxt, basename: 'license-dump', ripcord },
          opts
        ))
      } else {
        logger.info(dumpTxt) // stream report to stderr
      }
    })
  },

  _reportToCSV (pkgs) {
    return json2csv({ data: values(pkgs), quotes: '' })
  },

  _writeReport ({ txt, ripcord, basename, output, csv }) {
    const defaultFilename = `${basename}.${(csv ? 'csv' : 'json')}`
    const dest = ripcord._getDest(output, defaultFilename)
    fs.writeFileSync(dest, txt)
    logger.info(`license report written to: ${dest}`)
  }
}
