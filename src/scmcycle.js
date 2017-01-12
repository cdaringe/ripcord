"use strict";
const app_1 = require("./app");
const counsel = require("counsel");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
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
/* istanbul ignore next */
function _run(opts) {
    const pkg = counsel.targetProjectPackageJson;
    const pkgRoot = counsel.targetProjectRoot;
    const pkgFilename = counsel.targetProjectPackageJsonFilename;
    const pkgNameVersion = `${pkg.name}@${pkg.version}`;
    const publishRegistryUri = npm.config.get('publish_registry');
    const { branch, revision } = process.env;
    const readyToCycle = validatePrereqs();
    /* istanbul ignore next */
    if (!readyToCycle)
        return Promise.resolve();
    npmTest(pkgRoot);
    const twIdPkg = Object.assign({}, pkg, { [app_1.pkgId]: `com.${app_1.pkgId}.npm:${pkg.name}:${pkg.version}.b${branch}.${revision}` });
    return Promise.resolve()
        .then(() => generateDependencyReport(pkgRoot))
        .then(() => writeFileP(pkgFilename, JSON.stringify(twIdPkg, null, 2)))
        .then(() => publish(publishRegistryUri, pkgRoot))
        .then(() => restorePkgJson(null, pkg, pkgFilename), err => restorePkgJson(err, pkg, pkgFilename))
        .then(() => logger.info(`${pkgNameVersion} published successfully to ${publishRegistryUri}`))
        .catch(err => handleFail(err, pkgNameVersion));
}
/* istanbul ignore next */
function generateDependencyReport(pkgRoot) {
    logger.verbose('generating dependency report');
    const resp = child_process_1.spawnSync('npm', ['run', 'report'], { cwd: pkgRoot });
    if (resp.status)
        throw new Error(resp.stderr ? resp.stderr.toString() : 'failed to generate report');
}
exports.generateDependencyReport = generateDependencyReport;
/* istanbul ignore next */
function handleFail(err, pkgNameVersion) {
    if (err.message && err.message.match('pre-existing version')) {
        logger.warn(`${pkgNameVersion} already has artifact`);
        return;
    }
    throw err;
}
exports.handleFail = handleFail;
/* istanbul ignore next */
function npmTest(pkgRoot) {
    const testProc = child_process_1.spawnSync('npm', ['test'], { cwd: pkgRoot });
    if (testProc.error)
        throw testProc.error;
}
exports.npmTest = npmTest;
/* istanbul ignore next */
function publish(publishRegistryUri, pkgRoot) {
    logger.verbose('ripcord executing npm publish');
    const resp = child_process_1.spawnSync('npm', ['publish', '--registry', publishRegistryUri, '--verbose'], { cwd: pkgRoot });
    if (resp.status)
        throw new Error(resp.stderr ? resp.stderr.toString() : 'failed to npm publish');
}
exports.publish = publish;
/* istanbul ignore next */
function restorePkgJson(err, pkg, pkgFilename) {
    return writeFileP(pkgFilename, JSON.stringify(pkg, null, 2))
        .then(() => { if (err)
        throw err; });
}
exports.restorePkgJson = restorePkgJson;
/**
 * validates if we are ready to publish.
 * throws on error, or returns bool ~= readyToCycle
 * @returns {boolean} readyToCycle
 * @export
 */
function validatePrereqs() {
    const publishRegistryUri = npm.config.get('publish_registry');
    if (!publishRegistryUri)
        throw new Error([
            'npm config `publish_registry` not found.',
            'please add a `publish_registry` to your .npmrc'
        ].join(' '));
    let { branch, revision } = process.env;
    /* istanbul ignore next */
    if (!revision)
        throw new Error('env var `revision` not found');
    /* istanbul ignore next */
    if (!branch)
        throw new Error('env var `branch` not found');
    if (branch.match('refs/heads/'))
        branch = branch.replace('refs/heads/', '');
    /* istanbul ignore next */
    if (branch !== 'master') {
        logger.info(`skipping publish. branch ${branch} !== 'master'`);
        return false;
    }
    return true;
}
exports.validatePrereqs = validatePrereqs;
//# sourceMappingURL=scmcycle.js.map