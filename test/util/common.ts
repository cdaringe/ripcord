import * as path from 'path'
require('perish')
require('source-map-support').install() // silly typescript, source-maps are for kids!
export const dummyUiBuildProjectDirname = path.join(__dirname, '..', 'dummy-ui-build-project')
export const webpackConfigFilename = path.join(dummyUiBuildProjectDirname, 'webpack.config.js')
export const wpStub = {
  author: 'sokra',
  isStub: true,
  production: false,
  license: 'MIT',
  license1: 'MIT',
  name: 'webpack',
  version: '0.0.1'
}
