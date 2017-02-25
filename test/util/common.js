"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
require('perish');
require('source-map-support').install(); // silly typescript, source-maps are for kids!
const cp = require('child_process');
const counsel = require('counsel');
counsel.setTargetPackageMeta();
exports.dummyUiBuildProjectDirname = path.join(__dirname, '..', 'dummy-ui-build-project');
function linkWebpack() {
    cp.execSync('ln -s $PWD/node_modules/webpack $PWD/test/dummy-ui-build-project/node_modules/webpack');
}
exports.linkWebpack = linkWebpack;
function unlinkWebpack() {
    cp.execSync('rm -f $PWD/test/dummy-ui-build-project/node_modules/webpack');
}
exports.unlinkWebpack = unlinkWebpack;
exports.webpackConfigFilename = path.join(exports.dummyUiBuildProjectDirname, 'webpack.config.js');
exports.wpStub = {
    author: 'sokra',
    from: ['root@0.0.0', 'test@0.0.0'],
    isStub: true,
    license: 'MIT',
    license1: 'MIT',
    name: 'webpack',
    production: false,
    version: '1.14.1',
    requestedVersion: '^1.14.0'
};
//# sourceMappingURL=common.js.map