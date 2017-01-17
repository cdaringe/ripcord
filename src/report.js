"use strict";
const app_1 = require('./app');
const counsel = require('counsel');
const logger = require('./logger');
const resolveDeps = require('snyk-resolve-deps');
const uiBuild = require('./ui-build');
const _ = require('lodash');
const values = _.values;
const get = _.get;
function generate(action, opts) {
    const rptPkg = counsel.targetProjectPackageJson;
    /* istanbul ignore next */
    if (!rptPkg.name || !rptPkg.version) {
        throw new ReferenceError('package name and version required in package.json');
    }
    /* istanbul ignore next */
    if (!rptPkg.license)
        throw new ReferenceError('package requires a license in package.json');
    return getDependencies(opts)
        .then(deps => twFormat(rptPkg, deps));
}
exports.generate = generate;
/**
 * @export
 * @param {any} opts
 * @param {string} [opts.targetProjectRoot] project root to get dependencies from (defaults to counsel.targetProjectRoot)
 * @param {boolean} [opts.retainUnused]
 * @returns {Promise} Promise<IPkgSet>
 */
function getDependencies(opts) {
    opts = opts || {};
    const projectRoot = opts.targetProjectRoot || counsel.targetProjectRoot;
    const licenserConfig = {
        dev: true,
        extraFields: [app_1.pkgId, 'author', 'maintainer', 'maintainers']
    };
    const resDepsP = resolveDeps(projectRoot, licenserConfig);
    logger.verbose('getting logical dependencies');
    return Promise.resolve(resDepsP)
        .then(rootPkg => {
        handleSnykDepTypeBug({ pkgs: rootPkg.dependencies, root: true });
        return rootPkg.dependencies;
    })
        .then(pkgs => mapSnykPkgSetToPkgSet(pkgs))
        .then(pkgs => uiBuild.applyWebBuildTransform(pkgs, opts));
}
exports.getDependencies = getDependencies;
function getAuthorOrMaintainers(pkg) {
    let [author, mtn, mtns] = [get(pkg, 'author'), get(pkg, 'maintainer'), get(pkg, 'maintainers')];
    if (author) {
        if (typeof author === 'string')
            return author;
        let _author = `${author.name || 'UNKNOWN'}`;
        if (author.email)
            _author = `${_author}<${author.email}>`;
        return _author;
    }
    if (mtn)
        return mtn.name || mtn;
    if (Array.isArray(mtns)) {
        let names = [];
        mtns.forEach(mtn => {
            if (typeof mtn === 'string')
                names.push(mtn);
            if (mtn.name) {
                let _mtn = `${mtn.name}`;
                if (mtn.email)
                    _mtn = `${_mtn}<${mtn.email}>`;
                names.push(_mtn);
            }
        });
        return names.join('; ');
    }
    return '';
}
exports.getAuthorOrMaintainers = getAuthorOrMaintainers;
/**
 * see https://github.com/Snyk/resolve-deps/issues/28
 * @param {object} opts
 * @param {IPkgSet} opts.pkgs
 * @param {boolean} [opts.root]
 * @return {IPkgSet} pkgs
 */
function handleSnykDepTypeBug({ pkgs, root }) {
    _handleSnykDepTypeBugPrdWhitelist({ pkgs, root });
    _handleSnykDepTypeBugMarkDevDepsAsDev({ pkgs, root });
}
exports.handleSnykDepTypeBug = handleSnykDepTypeBug;
/**
 * traverse tree, marking all prd pkgs as prd, s.t. dev marker won't erroronesously flag as dev
 * @param {any} { pkgs, root }
 * @returns {object} pkgs
 */
function _handleSnykDepTypeBugPrdWhitelist({ pkgs, root }) {
    let _pkgs = values(pkgs || []);
    if (root)
        _pkgs = _pkgs.filter(pkg => pkg.depType.match(/prod/));
    _pkgs.forEach(pkg => {
        pkg.production = true;
        pkg.depType = 'prod';
        if (!pkg._syncDepTypeBugIsProd)
            _handleSnykDepTypeBugPrdWhitelist({ pkgs: pkg.dependencies, root: false });
        Object.defineProperty(pkg, '_syncDepTypeBugIsProd', { enumerable: false, writable: true, value: true });
    });
    return pkgs;
}
function _handleSnykDepTypeBugMarkDevDepsAsDev({ pkgs, root }) {
    let _pkgs = values(pkgs || []);
    if (root)
        _pkgs = _pkgs.filter(pkg => !pkg.depType.match(/prod/));
    _pkgs.forEach(pkg => {
        if (pkg._syncDepTypeBugIsProd)
            return;
        pkg.production = false;
        pkg.depType = 'dev';
        if (!pkg._syncDepTypeBugHandled)
            _handleSnykDepTypeBugMarkDevDepsAsDev({ pkgs: pkg.dependencies, root: false });
        Object.defineProperty(pkg, '_syncDepTypeBugHandled', { enumerable: false, writable: true, value: true });
    });
    return pkgs;
}
/**
 * mutates the snyk dep report in place to include only a small subset of keys for
 * noise reduction and ease of parsing for people interested in the report.
 * @private
 * @param {object} depSet snyk dep set
 * @returns {object}
 */
function mapSnykPkgSetToPkgSet(sSet) {
    let pSet = null;
    let pkgName;
    let pkg;
    let sPkg;
    let i = 0;
    if (!sSet || !Object.keys(sSet).length)
        return null;
    pSet = {};
    for (pkgName in sSet) {
        ++i;
        sPkg = sSet[pkgName];
        if (sPkg.depType === 'extraneous') { }
        else {
            const dSet = mapSnykPkgSetToPkgSet(sPkg.dependencies);
            // ^^ .dependencies _has_ deps and devDeps
            pkg = {
                author: getAuthorOrMaintainers(sPkg),
                from: sPkg.from,
                dependencies: dSet,
                license: sPkg.license,
                licenses: [sPkg.license],
                name: sPkg.name,
                production: !!sPkg.depType.match(/prod/),
                [app_1.pkgId]: sPkg[app_1.pkgId] || '',
                requestedVersion: sPkg.dep || '',
                version: sPkg.version
            };
            pSet[pkgName] = pkg;
        }
    }
    return pSet || null;
}
exports.mapSnykPkgSetToPkgSet = mapSnykPkgSetToPkgSet;
/**
 * apply formatting to snyk deps
 * @param {object} deps snyk deps
 * @returns {object} deps
 */
function twFormat(rptPkg, deps) {
    const prd = {};
    const dev = {};
    for (let pkgName in deps) {
        let pkg = deps[pkgName];
        if (pkg.production)
            prd[pkgName] = pkg;
        else
            dev[pkgName] = pkg;
    }
    return {
        package: {
            author: getAuthorOrMaintainers(rptPkg),
            name: rptPkg.name,
            version: rptPkg.version,
            license: rptPkg.license
        },
        configurations: {
            compile: prd,
            testCompile: dev
        }
    };
}
//# sourceMappingURL=report.js.map