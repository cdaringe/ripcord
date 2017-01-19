import { pkgId } from './app'
import * as counsel from 'counsel'
import { writeFile } from 'fs'
import { spawnSync } from 'child_process'
const npm = require('requireg')('npm')
const pify = require('pify')
const loadNpm = pify(npm.load)
const writeFileP = pify(writeFile)
import logger from './logger'

/* istanbul ignore next */
export function run (opts: any): Promise<any> {
  return loadNpm().then(_run)
}

/* istanbul ignore next */
function _run (opts: any): Promise<any> {
  const pkg = counsel.targetProjectPackageJson
  const pkgRoot = counsel.targetProjectRoot
  const pkgFilename = counsel.targetProjectPackageJsonFilename
  const pkgNameVersion = `${pkg.name}@${pkg.version}`
  const publishRegistryUri = npm.config.get('publish_registry')
  const { branch, revision } = process.env

  const readyToCycle = validatePrereqs()
  /* istanbul ignore next */
  if (!readyToCycle) return Promise.resolve()

  npmTest(pkgRoot)

  const twIdPkg = Object.assign(
    {},
    pkg,
    { [pkgId]: `com.${pkgId}.npm:${pkg.name}:${pkg.version}.b${branch}.${revision}` }
  )
  return Promise.resolve()
  .then(() => generateDependencyReport(pkgRoot))
  .then(() => writeFileP(pkgFilename, JSON.stringify(twIdPkg, null, 2)))
  .then(() => publish(publishRegistryUri, pkgRoot))
  .then(() => restorePkgJson(null, pkg, pkgFilename), err => restorePkgJson(err, pkg, pkgFilename))
  .then(() => logger.info(`${pkgNameVersion} published successfully to ${publishRegistryUri}`))
  .catch(err => handleFail(err, pkgNameVersion))
}

/* istanbul ignore next */
export function generateDependencyReport (pkgRoot: string) {
  logger.verbose('generating dependency report')
  const resp = spawnSync('npm', ['run', 'report'], { cwd: pkgRoot })
  if (resp.status) throw new Error(resp.stderr ? resp.stderr.toString() : 'failed to generate report')
}

/* istanbul ignore next */
export function handleFail (err: Error, pkgNameVersion: string) {
  if (err.message && err.message.match('pre-existing version')) {
    logger.warn(`${pkgNameVersion} already has artifact`)
    return
  }
  throw err
}

/* istanbul ignore next */
export function npmTest (pkgRoot: string) {
  const testProc = spawnSync('npm', ['test'], { cwd: pkgRoot })
  if (testProc.error) throw testProc.error
}

/* istanbul ignore next */
export function publish (publishRegistryUri: string, pkgRoot: string) {
  logger.verbose('ripcord executing npm publish')
  const resp = spawnSync('npm', ['publish', '--registry', publishRegistryUri, '--verbose'], { cwd: pkgRoot })
  if (resp.status) throw new Error(resp.stderr ? resp.stderr.toString() : 'failed to npm publish')
}

/* istanbul ignore next */
export function restorePkgJson (err: Error, pkg: any, pkgFilename: string) {
  return writeFileP(pkgFilename, JSON.stringify(pkg, null, 2))
  .then(() => { if (err) throw err })
}

/**
 * validates if we are ready to publish.
 * throws on error, or returns bool ~= readyToCycle
 * @returns {boolean} readyToCycle
 * @export
 */
export function validatePrereqs (): boolean {
  const publishRegistryUri = npm.config.get('publish_registry')
  if (!publishRegistryUri) throw new Error([
    'npm config `publish_registry` not found.',
    'please add a `publish_registry` to your .npmrc'
  ].join(' '))
  let { branch, revision } = process.env

  /* istanbul ignore next */
  if (!revision) throw new Error('env var `revision` not found')

  /* istanbul ignore next */
  if (!branch) throw new Error('env var `branch` not found')
  if (branch.match('refs/heads/')) branch = branch.replace('refs/heads/', '')

  /* istanbul ignore next */
  if (branch !== 'master') {
    logger.info(`skipping publish. branch ${branch} !== 'master'`)
    return false
  }
  return true
}
