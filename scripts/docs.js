/**
 * build and publish developer api docs to a project's github pages
 * @module docs
 */

'use strict'

require('perish')
const cp = require('child_process')
const ghpages = require('gh-pages')
const path = require('path')
const binPath = path.resolve(__dirname, '../node_modules/.bin')
const isWin = /^win/.test(process.platform)
const rmdir = (path) => { try { cp.execSync(`rm -rf ${path}`) } catch (e) { /* pass */ } }

let jsdocBinFilename = path.resolve(binPath, 'jsdoc')
if (isWin) jsdocBinFilename += '.cmd'

let jsdocConfigFilename = path.resolve(__dirname, 'jsdoc.json')
let projectReadmeFilename = path.resolve(__dirname, '../README.md')
let sourceDirname = path.resolve(__dirname, '../src')
let dest = path.resolve(__dirname, '../docs')
let projectRootDirname = path.resolve(__dirname, '..')
let templateDirname = path.dirname(require.resolve('minami'))

try {
  const cmd = jsdocBinFilename
  const args = [
    '--configure', jsdocConfigFilename,
    '--recurse',
    '--readme', projectReadmeFilename,
    '--template', templateDirname,
    '--destination', dest,
    sourceDirname
  ]
  rmdir(dest)
  let rslt = cp.spawnSync(cmd, args, { cwd: projectRootDirname })
  if (rslt.stdout.length) console.log(rslt.stdout.toString())
  if (rslt.stderr.length) throw new Error(rslt.stderr.toString())
} catch (err) {
  console.error(err)
  process.exit(1)
}

// publish.
ghpages.publish(dest, (err) => {
  rmdir(dest)
  if (err) throw err
  console.log('docs successfully published')
})

