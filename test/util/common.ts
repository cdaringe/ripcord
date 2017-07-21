import * as path from 'path'
require('perish')
require('source-map-support').install() // silly typescript, source-maps are for kids!
const cp = require('child_process')
const counsel = require('counsel')
counsel.setTargetPackageMeta()
export const dummyUiBuildProjectDirname = path.join(__dirname, '..', 'dummy-ui-build-project')
export function linkWebpack () {
  try {
    cp.execSync('ln -s $PWD/node_modules/webpack $PWD/test/dummy-ui-build-project/node_modules/webpack')
  } catch (err) {
    if (!err.message.match(/file exists/i)) throw err
  }
}
export function unlinkWebpack () {
  cp.execSync('rm -f $PWD/test/dummy-ui-build-project/node_modules/webpack')
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
