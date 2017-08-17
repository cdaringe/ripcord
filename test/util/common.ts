import * as path from 'path'
import * as execa from 'execa'
import * as fs from 'fs-extra'

// setup test env
require('perish')
require('source-map-support').install() // silly typescript, source-maps are for kids!
const cp = require('child_process')
const counsel = require('counsel')
counsel.setTargetPackageMeta()

export const dummyUiBuildProjectDirname = path.join(__dirname, '..', 'dummy-ui-build-project')
const RIPCORD_WEBPACK_INSTALL_DIR = path.resolve(__dirname, '..', '..', 'node_modules', 'webpack')
const DUMMY_PROJECT_WEBPACK_INSTALL_DIR = path.resolve(dummyUiBuildProjectDirname, 'node_modules/webpack')

export async function linkWebpack () {
  try {
    return await fs.symlink(RIPCORD_WEBPACK_INSTALL_DIR, DUMMY_PROJECT_WEBPACK_INSTALL_DIR)
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}
export async function unlinkWebpack () {
  return await fs.remove(DUMMY_PROJECT_WEBPACK_INSTALL_DIR)
}
export const webpackConfigFilename = path.join(dummyUiBuildProjectDirname, 'webpack.config.js')
export const wpStub = {
  author: 'sokra',
  from: ['root@0.0.0', 'test@0.0.0'],
  isStub: true,
  license: 'MIT',
  license1: 'MIT',
  name: 'webpack',
  production: false,
  version: '1.14.1',
  requestedVersion: '^1.14.0'
}
