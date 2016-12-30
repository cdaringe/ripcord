"use strict";
const tape = require('tape');
const sinon = require('sinon');
const sync = require('../src/sync-packages-to-registry');
const npm = require('requireg')('npm');
const logger = require('../src/logger');
const nock = require('nock');
const ARTIFACTORY_URI = 'http://www.bogus.com/artifactory';
const NPM_REGISTRY_SRC = 'src';
const NPM_REGISTRY_DEST = 'dest';
const NPM_REGISTRY_SRC_CACHE = 'cache';
const setupNpmConfig = () => {
    npm.config.set('_auth', 'test-auth');
    npm.config.set('ARTIFACTORY_URI', ARTIFACTORY_URI);
    npm.config.set('NPM_REGISTRY_SRC', NPM_REGISTRY_SRC);
    npm.config.set('NPM_REGISTRY_DEST', NPM_REGISTRY_DEST);
    npm.config.set('NPM_REGISTRY_SRC_CACHE', NPM_REGISTRY_SRC_CACHE);
};
const teardownNpmConfig = () => {
    npm.config.set('_auth', '');
    npm.config.set('ARTIFACTORY_URI', '');
    npm.config.set('NPM_REGISTRY_SRC', '');
    npm.config.set('NPM_REGISTRY_DEST', '');
    npm.config.set('NPM_REGISTRY_SRC_CACHE', '');
};
function noCITest(name, cb) {
    if (process.env.CI) {
        return console.log([
            `skipping test on CI mode: ${name}.`,
            'CI does not resolve deps as npm naturally does',
            'hence resolved URIs cannot be reliably obtained'
        ].join(' '));
    }
    return tape(name, cb);
}
noCITest('setup', t => {
    t.plan(1);
    logger.setLogLevel('silent');
    return sync._loadNpm()
        .then(() => t.pass('sync setup'))
        .catch(t.fail)
        .then(t.end);
});
noCITest('sync env params valid', t => {
    setupNpmConfig();
    const stub = sinon.stub(npm.config, 'get', () => null);
    t.throws(() => sync._assertEnv(), /missing/, 'asserts env keys not present');
    stub.restore();
    teardownNpmConfig();
    t.end();
});
noCITest('sync - dry', t => {
    setupNpmConfig();
    const copySpy = sinon.spy(sync, '_copyPackage');
    const getRoute = `${ARTIFACTORY_URI}/api/storage/dest/`;
    // "http://www.bogus.com/artifactory/api/storage/dest/archy"
    // "http://www.bogus.com/artifactory/api/storage/dest"
    nock(getRoute).get(/.*/).times(1000).reply(200, {});
    // ^ dryRun still _may_ attempt http requests against src repo, just won't copy'
    t.plan(2);
    return sync.sync({ dryRun: true, skip: ['ripcord'] })
        .then((pkgs) => {
        t.ok(pkgs.length, 'presents packages');
        t.notOk(copySpy.called, 'no copy operation on dryRun');
        copySpy.restore();
        nock.cleanAll();
        t.end();
    }, t.end);
});
noCITest('sync - fo real', t => {
    setupNpmConfig();
    nock(`${ARTIFACTORY_URI}/api/storage/${NPM_REGISTRY_DEST}`).get(/.*/).times(2000).reply(404, {});
    nock(`${ARTIFACTORY_URI}/api/copy/${NPM_REGISTRY_SRC_CACHE}`).post(/.*/).times(2000).reply(200, {});
    t.plan(2);
    const realSyncPackage = sync._syncPackage;
    const syncPkgStub = sinon.stub(sync, '_syncPackage', (pkg) => {
        pkg.artifactoryTarball = 'bananas/-/bananas@0.0.1.tgz';
        pkg._resolved = `http://www.fake.com/artifactory/bananas@0.0.1.tgz/${pkg.artifactoryTarball}`;
        pkg.action = 'ACTION_SYNC';
        return realSyncPackage.call(sync, pkg);
    });
    return sync.sync()
        .then((pkgs) => {
        t.ok(pkgs.length, 'presents packages');
        nock.cleanAll();
        syncPkgStub.restore();
        t.pass('teardown');
        t.end();
    }, t.end);
});
tape('artifactory storage suffixes', t => {
    t.equals(sync._getScopedPkgLocalUriSuffix('pkg', '0.0.1'), `pkg/-/pkg-0.0.1.tgz`, 'non-scoped package suffix');
    t.equals(sync._getScopedPkgLocalUriSuffix('@scoped/pkg', '0.0.1'), `@scoped/pkg/-/pkg-0.0.1.tgz`, 'scoped package suffix');
    t.end();
});
//# sourceMappingURL=sync-pkgs.js.map