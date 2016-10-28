/**
 * build and publish developer api docs to a project's github pages
 * @module docs
 * @private
 */

'use strict'

const cp = require('child_process')
const ghpages = require('gh-pages')
const path = require('path')
const binPath = path.resolve(__dirname, '../node_modules/.bin')
const isWin = /^win/.test(process.platform)
const rmdir = (path) => { try { cp.execSync(`rm -rf ${path}`) } catch (e) { /* pass */ } }
const counsel = require('counsel')
const pify = require('pify')

let jsdocBinFilename = path.resolve(binPath, 'jsdoc')
if (isWin) jsdocBinFilename += '.cmd'

module.exports = {

  _clean () {
    const { dest } = this._getDocsMetaData()
    return rmdir(dest)
  },

  _getDocsMetaData () {
    return {
      jsdocConfigFilename: path.resolve(__dirname, 'jsdoc.json'),
      projectReadmeFilename: path.resolve(counsel.targetProjectRoot, 'README.md'),
      sourceDirname: path.resolve(counsel.targetProjectRoot, 'src'),
      dest: path.resolve(counsel.targetProjectRoot, 'docs'),
      projectRootDirname: counsel.targetProjectRoot
    }
  },

  _ghPublish: pify(ghpages.publish),

  /**
   * build api docs, crash hard if invalid!
   * @TODO do things async. come on.
   * @param {any} opts
   * @returns Promise
   */
  build (opts) {
    try {
      const {
        jsdocConfigFilename,
        projectReadmeFilename,
        dest,
        sourceDirname,
        projectRootDirname
      } = this._getDocsMetaData()
      const cmd = jsdocBinFilename
      const args = [
        '-c', jsdocConfigFilename,
        '-R', projectReadmeFilename,
        '-d', dest,
        sourceDirname
      ]
      this._clean()
      let rslt = cp.spawnSync(cmd, args, { cwd: projectRootDirname })
      if (rslt.stdout.length) console.log(rslt.stdout.toString())
      if (rslt.stderr.length) throw new Error(rslt.stderr.toString())
    } catch (err) {
      console.error(err)
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
