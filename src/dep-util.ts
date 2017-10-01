import { IPkgSet } from './model/pkg'
import { readFile, lstat } from 'fs'
import logger from './logger'
const pify = require('pify')
const parseNameAtVersion = require('parse-name-at-version')
const pyl = require('parse-yarn-lock').default
const findIndex = require('lodash/findIndex')

const readFileP = pify(readFile)
const lstatP = pify(lstat)

export function getFirstFile (files: Array<String>): Promise<(null|String)> {
  if (!files || !files.length) return null
  const getFileAttempts = files.map(file => {
    return lstatP(file)
    .catch(err => {
      if (err.code !== 'ENOENT') throw err
      return null
    })
  })
  return Promise.all(getFileAttempts)
  .then(stats => {
    return files[findIndex(stats)] || null
  })
}

export async function maybeLoadLockfile (lockfile: String) {
  if (!lockfile) return null
  if (lockfile.indexOf('yarn.lock') >= 0) {
    const lockContent = await readFileP(lockfile)
    let parsed = pyl(lockContent.toString())
    if (parsed) parsed = parsed.object || parsed
    return normalizeYarnLock(parsed)
  } else {
    logger.warn([
      'using npm-shrinkwrap.json as an optimization to speedy dependency lookup',
      'has not yet been implemented.  feel free to land a PR!'
    ].join(' '))
  }
  // consider supporting npm shrinkwrap
  return null
}

/**
 * Apply missing fields to parsed yarn.lock object
 * @returns {IPkgSet}
 */
function normalizeYarnLock (lock): IPkgSet {
  for (let name in lock) {
    let pkg = lock[name]
    pkg.name = parseNameAtVersion(name).name
  }
  return lock
}

export async function tryLoadLockfile (): Promise<IPkgSet> {
  const lockfile = await getFirstFile(['yarn.lock', 'npm-shrinkwrap.json'])
  return maybeLoadLockfile(lockfile)
}
