"use strict";
const fs_1 = require('fs');
const logger_1 = require('./logger');
const pify = require('pify');
const parseNameAtVersion = require('parse-name-at-version');
const pyl = require('parse-yarn-lock');
const findIndex = require('lodash/findIndex');
const readFileP = pify(fs_1.readFile);
const lstatP = pify(fs_1.lstat);
function getFirstFile(files) {
    if (!files || !files.length)
        return null;
    const getFileAttempts = files.map(file => {
        return lstatP(file)
            .catch(err => {
            if (err.code !== 'ENOENT')
                throw err;
            return null;
        });
    });
    return Promise.all(getFileAttempts)
        .then(stats => {
        return files[findIndex(stats)] || null;
    });
}
exports.getFirstFile = getFirstFile;
function maybeLoadLockfile(lockfile) {
    if (!lockfile)
        return null;
    if (lockfile.indexOf('yarn.lock') >= 0) {
        return readFileP(lockfile)
            .then(lockContent => pify(pyl.parse.bind(pyl))(lockContent.toString()))
            .then(normalizeYarnLock);
    }
    else {
        logger_1.default.warn([
            'using npm-shrinkwrap.json as an optimization to speedy dependency lookup',
            'has not yet been implemented.  feel free to land a PR!'
        ].join(' '));
    }
    // consider supporting npm shrinkwrap
    return null;
}
exports.maybeLoadLockfile = maybeLoadLockfile;
/**
 * Apply missing fields to parsed yarn.lock object
 * @returns {IPkgSet}
 */
function normalizeYarnLock(lock) {
    for (let name in lock) {
        let pkg = lock[name];
        pkg.name = parseNameAtVersion(name).name;
    }
    return lock;
}
function tryLoadLockfile() {
    return getFirstFile(['yarn.lock', 'npm-shrinkwrap.json'])
        .then(maybeLoadLockfile);
}
exports.tryLoadLockfile = tryLoadLockfile;
//# sourceMappingURL=dep-util.js.map