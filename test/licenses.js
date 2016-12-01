"use strict";
const path = require('path');
const common_1 = require('./util/common');
const tape = require('tape');
const sinon = require('sinon');
const ripcord = require('../');
const licenses = require('../src/licenses');
const uiBuild = require('../src/ui-build');
const fs = require('fs');
tape('license check', t => {
    const origHandleGetLicensesCheck = licenses._checkLicenses;
    const stub = sinon.stub(licenses, '_checkLicenses', (pkgs, opts, rc) => {
        pkgs = { name: 'dummy-pkg', version: '0.0.1' };
        return origHandleGetLicensesCheck.apply(licenses, [pkgs, opts, ripcord]);
    });
    t.plan(2);
    Promise.resolve()
        .then(() => ripcord.licenses('check', { force: true, throwOnFail: true, uiBuild: false }))
        .then(t.fail)
        .catch(err => t.ok(err.message.match(/unapproved/), 'biffs on unapproved licenses'))
        .then(() => stub.restore())
        .then(() => t.pass('license check teardown'))
        .then(t.end, t.end);
});
tape('license dump', t => {
    t.plan(1);
    const destDir = fs.mkdtempSync('/tmp' + path.sep);
    const destFilename = path.join(destDir, 'test-dump.csv');
    Promise.resolve()
        .then(() => ripcord.licenses('dump', { csv: true, dev: true, throwOnFail: true, output: destFilename, uiBuild: false }))
        .then(() => t.ok(fs.existsSync(destFilename, 'dump generated')))
        .then(t.end, t.end);
});
tape('license check, web-build', t => {
    const opts = {
        dev: true,
        force: true,
        throwOnFail: true,
        targetProjectRoot: common_1.dummyUiBuildProjectDirname,
        webpackConfig: common_1.webpackConfigFilename
    };
    t.plan(2);
    const rStub = uiBuild.applyWebBuildTransform;
    const stub = sinon.stub(uiBuild, 'applyWebBuildTransform', (pkgs, opts) => {
        pkgs.webpack = common_1.wpStub;
        return rStub.call(uiBuild, pkgs, opts);
    });
    Promise.resolve()
        .then(() => ripcord.licenses('check', opts))
        .then(t.fail)
        .catch(err => t.ok(err.message.match(/unapproved/), 'biffs on unapproved licenses'))
        .then(() => t.pass('license check teardown'))
        .then(t.end, t.end);
});
//# sourceMappingURL=licenses.js.map