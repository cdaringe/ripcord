/**
 * build and publish developer api docs to a project's github pages
 * @module docs
 * @private
 */

import * as path from 'path'
import logger from './logger'
const cp = require('child_process')
const rmdir = (path) => { try { cp.execSync(`rm -rf ${path}`) } catch (e) { /* pass */ } }
const counsel = require('counsel')
const pify = require('pify')

module.exports = {

  _clean () {
    const { dest } = this._getDocsMetaData()
    return rmdir(dest)
  },

  _getDocsMetaData () {
    return {
      jsdocConfigFilename: path.resolve(__dirname, '..', 'assets', 'jsdoc.json'),
      projectReadmeFilename: path.resolve(counsel.targetProjectRoot, 'README.md'),
      sourceDirname: path.resolve(counsel.targetProjectRoot, 'src'),
      dest: path.resolve(counsel.targetProjectRoot, 'docs'),
      projectRootDirname: counsel.targetProjectRoot,
      templateDirname: path.dirname(require.resolve('minami'))
    }
  },

  get _ghPublish () { return pify(require('gh-pages').publish) },

  /**
   * build api docs, crash hard if invalid!
   * @TODO do things async. come on.
   * @param {any} opts
   * @returns Promise
   */
  build (opts) {
    const jsdocBin = require('resolve-jsdoc-bin')
    let jsdocBinFilename = jsdocBin.resolve(__dirname)
    try {
      const {
        jsdocConfigFilename,
        projectReadmeFilename,
        dest,
        sourceDirname,
        projectRootDirname,
        templateDirname
      } = this._getDocsMetaData()
      const cmd = jsdocBinFilename
      const args = [
        '--configure', jsdocConfigFilename,
        '--recurse',
        '--readme', projectReadmeFilename,
        '--template', templateDirname,
        '--destination', dest,
        sourceDirname
      ]
      this._clean()
      let rslt = cp.spawnSync(cmd, args, { cwd: projectRootDirname })
      /* istanbul ignore next */
      if (rslt.error) throw rslt.error
      /* istanbul ignore next */
      if (rslt.stdout.length) console.log(rslt.stdout.toString())
      /* istanbul ignore next */
      if (rslt.stderr.length) throw new Error(rslt.stderr.toString())
    } catch (err) {
      /* istanbul ignore next */
      logger.error(err.message)
      process.exit(1)
    }
    return Promise.resolve()
  },

  publish (opts) {
    const { dest } = this._getDocsMetaData()
    return this._ghPublish(dest)
    .then(() => this._clean())
    .then(() => console.log('docs successfully published'))
  }
}
