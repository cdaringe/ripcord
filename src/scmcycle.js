"use strict";
const app_1 = require('./app');
const counsel = require('counsel');
const fs_1 = require('fs');
const child_process_1 = require('child_process');
const npm = require('requireg')('npm');
const pify = require('pify');
const loadNpm = pify(npm.load);
const writeFileP = pify(fs_1.writeFile);
const logger = require('./logger');
/* istanbul ignore next */
function run(opts) {
    return loadNpm().then(_run);
}
exports.run = run;
function _run(opts) {
    const pkg = counsel.targetProjectPackageJson;
    const pkgRoot = counsel.targetProjectRoot;
    const pkgFilename = counsel.targetProjectPackageJsonFilename;
    const pkgNameVersion = `${pkg.name}@${pkg.version}`;
    const publishRegistryUri = npm.config.get('publish_registry');
    if (!publishRegistryUri)
        throw new Error([
            'npm config `publish_registry` not found.',
            'please add a `publish_registry` to your .npmrc'
        ].join(' '));
    const buildRevision = process.env.revision;
    if (!buildRevision)
        throw new Error('env var `revision` not found');
    let branch = process.env.branch;
    if (!branch)
        throw new Error('env var `branch` not found');
    if (branch.match('refs/heads/'))
        branch = branch.replace('refs/heads/', '');
    const testProc = child_process_1.spawnSync('npm', ['test'], { cwd: pkgRoot });
    if (testProc.error)
        throw testProc.error;
    if (branch !== 'master') {
        logger.info(`skipping publish. branch ${branch} !== 'master'`);
        return Promise.resolve();
    }
    const twIdPkg = Object.assign({}, pkg, { [app_1.pkgId]: `com.${app_1.pkgId}.npm:${pkg.name}:${pkg.version}.b${branch}.${buildRevision}` });
    const restorePkgJson = (err) => {
        return writeFileP(pkgFilename, JSON.stringify(pkg, null, 2))
            .then(() => { if (err)
            throw err; });
    };
    return Promise.resolve()
        .then(() => {
        logger.verbose('generating dependency report');
        const resp = child_process_1.spawnSync('npm', ['run', 'report'], { cwd: pkgRoot });
        if (resp.status)
            throw new Error(resp.stderr ? resp.stderr.toString() : 'failed to generate report');
    })
        .then(() => writeFileP(pkgFilename, JSON.stringify(twIdPkg, null, 2)))
        .then(() => {
        logger.verbose('ripcord executing npm publish');
        const resp = child_process_1.spawnSync('npm', ['publish', '--registry', publishRegistryUri, '--verbose'], { cwd: pkgRoot });
        if (resp.status)
            throw new Error(resp.stderr ? resp.stderr.toString() : 'failed to npm publish');
    })
        .then(restorePkgJson, restorePkgJson)
        .then(() => logger.info(`${pkgNameVersion} published successfully to ${publishRegistryUri}`))
        .catch(err => {
        if (err.message && err.message.match('pre-existing version')) {
            logger.warn(`${pkgNameVersion} already has artifact`);
            return;
        }
        throw err;
    });
}
//# sourceMappingURL=scmcycle.js.map