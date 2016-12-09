import { pkgId } from './app'
import * as counsel from 'counsel'
import { writeFile } from 'fs'
import { spawnSync } from 'child_process'
const pify = require('pify')
const writeFileP = pify(writeFile)
const logger = require('./logger')

/* istanbul ignore next */
export function run (opts : any) : Promise<any> {
  const pkg = counsel.targetProjectPackageJson
  const pkgRoot = counsel.targetProjectRoot
  const pkgFilename = counsel.targetProjectPackageJsonFilename
  const pkgNameVersion = `${pkg.name}@${pkg.version}`

  const registryUri = process.env.npm_config_publish_registry
  if (!registryUri) throw new Error([
    'npm config `publish_registry` not found.',
    'please add a `publish_registry` to your .npmrc'
  ].join(' '))

  const buildRevision = process.env.revision
  if (!buildRevision) throw new Error('env var `revision` not found')

  let branch = process.env.branch
  if (!branch) throw new Error('env var `branch` not found')
  if (branch.match('refs/heads/')) branch = branch.replace('refs/heads/', '')

  const testProc = spawnSync('npm', ['test'], { cwd: pkgRoot })
  if (testProc.error) throw testProc.error

  if (branch !== 'master') {
    logger.info(`skipping publish. branch ${branch} !== 'master'`)
    return Promise.resolve()
  }

  const twIdPkg = Object.assign(
    {},
    pkg,
    { [pkgId]: `com.${pkgId}.npm:${pkg.name}:${pkg.version}.b${branch}.${buildRevision}` }
  )
  const restorePkgJson = (err) => {
    return writeFileP(pkgFilename, JSON.stringify(pkg, null, 2))
    .then(() => { if (err) throw err })
  }
  return Promise.resolve()
  .then(() => {
    logger.verbose('generating dependency report')
    const resp = spawnSync('npm', ['run', 'report'], { cwd: pkgRoot })
    if (resp.status) throw new Error(resp.stderr ? resp.stderr.toString() : 'failed to generate report')
  })
  .then(() => writeFileP(pkgFilename, JSON.stringify(twIdPkg, null, 2)))
  .then(() => {
    logger.verbose('ripcord executing npm publish')
    const resp = spawnSync('npm', ['publish', '--verbose'], { cwd: pkgRoot })
    if (resp.status) throw new Error(resp.stderr ? resp.stderr.toString() : 'failed to npm publish')
  })
  .then(restorePkgJson, restorePkgJson)
  .then(() => logger.info(`${pkgNameVersion} published successfully to ${registryUri}`))
  .catch(err => {
    if (err.message && err.message.match('pre-existing version')) {
      logger.warn(`${pkgNameVersion} already has artifact`)
      return
    }
    throw err
  })
}
