"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const common = require('./util/common');
const tape = require('tape');
const uiBuild = require('../src/ui-build');
const report = require('../src/report');
const sinon = require('sinon');
const { dummyUiBuildProjectDirname, webpackConfigFilename, wpStub, linkWebpack, unlinkWebpack } = common;
const counsel = require('counsel');
const getDummyPkgs = function (opts) {
    const dOpts = Object.assign({ targetProjectRoot: dummyUiBuildProjectDirname }, opts || {});
    return report.getDependencies(dOpts)
        .then(deps => {
        assert.ok(deps['dummy-pkg'], 'dummy-pkg located');
        assert.ok(deps['unused-pkg'], 'unused-pkg located');
        return deps;
    });
};
// will fail on windows machines! @TODO update paths to be windows friendly
tape('webpack - name extaction', t => {
    t.throws(() => uiBuild._extractWebpackNodeModulePackageName('..'), 'biffs on no pkg name');
    t.throws(() => uiBuild._extractWebpackNodeModulePackageName('../~'), 'biffs on no pkg name');
    t.throws(() => uiBuild._extractWebpackNodeModulePackageName('node_modules/~'), 'biffs on no pkg name');
    t.throws(() => uiBuild._extractWebpackNodeModulePackageName('~/node_modules'), 'biffs on no pkg name');
    t.equals(uiBuild._extractWebpackNodeModulePackageName('/beep/bop/~/boop/blah'), 'boop', 'detects pkg name');
    t.equals(uiBuild._extractWebpackNodeModulePackageName('../~/boop/blah'), 'boop', 'detects pkg name');
    t.equals(uiBuild._extractWebpackNodeModulePackageName('../~/@beep/bop/bif'), '@beep/bop', 'detects pkg name');
    t.equals(uiBuild._extractWebpackNodeModulePackageName('../!!!0#)@(*/node_modules/@beep/bop'), '@beep/bop', 'detects pkg name');
    t.end();
});
tape('ui build fails without build config', t => {
    t.plan(1);
    // let hasUiBuildStub = sinon.stub(uiBuild, 'hasUiBuild', () => true)
    Promise.resolve()
        .then(() => getDummyPkgs({ uiBuild: false }))
        .then(pkgs => {
        pkgs.webpack = wpStub; // stub in dummy webpack dependency to IPkgSet report
        return uiBuild.applyWebBuildTransform(Object.assign({}, pkgs));
    })
        .then(t.fail)
        .catch(err => {
        t.ok(err.message.match('build configuration'), 'errors if no ui build configuration passed');
    })
        .then(t.end, t.end);
});
tape('ui dependencies transform flatly', t => {
    t.plan(2);
    const prevRoot = counsel.targetProjectRoot;
    linkWebpack();
    counsel.targetProjectRoot = dummyUiBuildProjectDirname;
    return Promise.resolve()
        .then(() => getDummyPkgs({ uiBuild: false }))
        .then(pkgs => {
        pkgs.webpack = wpStub; // stub in webpack
        return uiBuild.applyWebBuildTransform(Object.assign({}, pkgs), { uiBuild: true, webpackConfig: webpackConfigFilename });
    })
        .then(pkgs => {
        t.equal(pkgs['dummy-pkg;0.0.1'].production, true, 'devDep consumed by build transfers to prod dep');
    })
        .then(() => {
        counsel.targetProjectRoot = prevRoot;
        unlinkWebpack();
        t.pass('teardown');
    });
});
//# sourceMappingURL=ui-build.js.map