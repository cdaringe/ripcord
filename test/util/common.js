"use strict";
const path = require("path");
require('perish');
require('source-map-support').install(); // silly typescript, source-maps are for kids!
exports.dummyUiBuildProjectDirname = path.join(__dirname, '..', 'dummy-ui-build-project');
exports.webpackConfigFilename = path.join(exports.dummyUiBuildProjectDirname, 'webpack.config.js');
exports.wpStub = {
    author: 'sokra',
    isStub: true,
    production: false,
    license: 'MIT',
    license1: 'MIT',
    name: 'webpack',
    version: '0.0.1'
};
//# sourceMappingURL=common.js.map