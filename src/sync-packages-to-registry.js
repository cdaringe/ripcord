/**
 * @private
 * @module sync-packages-to-registry
 * @description syncs packages from one npm artifactory registry to another
 */
"use strict";
const bb = require('bluebird');
const { get, values } = require('lodash');
const logger = require('./logger');
const pify = require('pify');
const npm = require('requireg')('npm');
const request = require('request');
const STATUS_NOT_EXISTS = 'STATUS_NOT_EXISTS';
const STATUS_EXISTS = 'STATUS_EXISTS';
const STATUS_INVALID_RESOLVE_GIT = 'STATUS_INVALID_RESOLVE_GIT';
const STATUS_INVALID_RESOLVE_URI = 'STATUS_INVALID_RESOLVE_URI';
const ACTION_SKIP = 'ACTION_SKIP';
const ACTION_SYNC = 'ACTION_SYNC';
module.exports = {
    /**
     * @private
     * @property _destRepoName
     * @description destination repository to copy to. set post `sync()` call
     * @private
     */
    _destRepoName: null,
    /**
     * @private
     */
    _envKeys: [
        '_auth',
        'ARTIFACTORY_URI',
        'NPM_REGISTRY_DEST',
        'NPM_REGISTRY_SRC',
        'NPM_REGISTRY_SRC_CACHE'
    ],
    /**
     * @private
     * @description asserts that npmrc configuration values are in places
     * @returns undefined
     */
    _assertEnv() {
        const missingKeys = this._envKeys.filter(key => !npm.config.get(key));
        if (missingKeys.length) {
            const msgMissingKeys = `.npmrc keys missing: ${missingKeys.join(', ')}`;
            logger.error([
                `${msgMissingKeys}\n\n`,
                'to sucessfully copy packages from an external',
                'repository to a local repository, please ensure that the following keys',
                'are set in your npmrc:\n',
                '\t_auth=some-base64-encoded-str\n',
                '\tARTIFACTORY_URI=https://my-artifactory.com/artifactory\n',
                '\tNPM_REGISTRY_DEST=local-npm-repo\n',
                '\tNPM_REGISTRY_SRC=external-npm-repo\n',
                '\tNPM_REGISTRY_SRC_CACHE=registry-cache\n'
            ].join(' '));
            throw new Error(msgMissingKeys);
        }
        logger.verbose([
            `ARTIFACTORY_URI: ${npm.config.get('ARTIFACTORY_URI')}`,
            `NPM_REGISTRY_DEST: ${npm.config.get('NPM_REGISTRY_DEST')}`,
            `NPM_REGISTRY_SRC: ${npm.config.get('NPM_REGISTRY_SRC')}`,
            `NPM_REGISTRY_SRC_CACHE: ${npm.config.get('NPM_REGISTRY_SRC_CACHE')}`,
        ].join('\n'));
    },
    /**
     * @private
     * @description Build set of all dependencies (+devDeps).  Set consists of just package names
     * @warning set is volatile and modified on each call
     * @param {object} opts
     * @param {Set} opts.pkgs set of package names (volatile)
     * @param {object} opts.pkg parsed package.json
     * @param {object} opts.isTopLevel top-level package flag
     * @returns undefined
     */
    _buildFlatDeps({ pkgs, pkg, isTopLevel }) {
        if (pkg.missing && pkg.optional)
            return pkgs;
        if (pkg.missing) {
            throw new Error(`missing package detected: ${pkg.name}@${pkg.version}. please npm install and retry`);
        }
        if (!pkg.name)
            throw new Error('unable to identify package name. please purge node_modules and reinstall ');
        if (!isTopLevel)
            pkgs.push(pkg);
        if (pkg.dependencies) {
            const dependencies = pkg.dependencies;
            for (const name in dependencies) {
                this._buildFlatDeps({ pkgs, pkg: dependencies[name] });
            }
        }
        return pkgs;
    },
    /**
     * @private
     * @description copies package from src to dest repo
     * @param {object} pkg
     * @param {string} pkg.name
     * @returns Promise
     */
    _copyPackage(pkg) {
        /* istanbul ignore next */
        if (!pkg.artifactoryTarball) {
            throw new ReferenceError('`.tarball` field missing. unable to copy pkg');
        }
        const copyUri = [
            npm.config.get('ARTIFACTORY_URI'),
            'api/copy',
            npm.config.get('NPM_REGISTRY_SRC_CACHE'),
            `${pkg.artifactoryTarball}?to=/${this._destRepoName}`,
            pkg.artifactoryTarball
        ].join('/');
        const post = pify(request.post);
        return post(copyUri, this._getRequestHeaders())
            .then(response => {
            /* istanbul ignore next */
            if (response.statusCode !== 200) {
                this._throwResponseError(response, pkg, copyUri);
            }
            pkg.status = STATUS_EXISTS;
        });
    },
    /**
     * @private
     * @description tags & filters packages for syncing. packages from npm ls are already deduped,
     * but may contain multiple versions
     * @param {object[]} pkgs
     * @returns object[] pkgs
     */
    _tagPackagesToSync(pkgs) {
        const base = npm.config.get('ARTIFACTORY_URI');
        const srcReg = npm.config.get('NPM_REGISTRY_SRC');
        const artifactoryUri = `${base}/api/npm/${srcReg}`;
        const npmRegistrySrcUri = 'https://registry.npmjs.org';
        const unresolved = [];
        const gitResolved = [];
        const pkgsByKey = {};
        const tagged = pkgs.filter((pkg, ndx) => {
            const resolvedUri = get(pkg, 'dist.tarball') || '';
            const isResolvedArtifactory = !!resolvedUri.match(artifactoryUri);
            const isResolvedNPM = !!resolvedUri.match(/registry\.npmjs\.org/);
            const isResolvedGithub = !!resolvedUri.match(/github.com/);
            /* istanbul ignore next */
            if (isResolvedNPM) {
                logger.post('npm-resolved', `${pkg.name}@${pkg.version}`);
                logger.warn([
                    `package resolved from npmjs.org: ${pkg.name}. will attempt to find`,
                    'and copy it from artifactory. brace for impact 💣'
                ].join(' '));
            }
            else if (!isResolvedArtifactory) {
                if (isResolvedGithub) {
                    gitResolved.push(pkg);
                    pkg.action = ACTION_SKIP;
                    pkg.status = STATUS_INVALID_RESOLVE_GIT;
                }
                else {
                    logger.warn([
                        `package not resolved from artifactory or github: ${pkg.name}`,
                        resolvedUri || 'NO_URI_AVAILABLE'
                    ].join(', '));
                    pkg.action = ACTION_SKIP;
                    pkg.status = STATUS_INVALID_RESOLVE_URI;
                    unresolved.push(pkg);
                }
                return true;
            }
            pkg.artifactoryTarball = isResolvedNPM
                ? pkg.dist.tarball.substring(npmRegistrySrcUri.length + 1)
                : pkg.dist.tarball.substring(artifactoryUri.length + 1);
            // handle collisions
            const existing = !!pkgsByKey[pkg.artifactoryTarball];
            return !existing;
        });
        /* istanbul ignore next */
        if (unresolved.length)
            this._handleUnresolvedPkgs(unresolved);
        /* istanbul ignore next */
        if (gitResolved.length)
            this._handleGitResolvedPkgs(gitResolved);
        return tagged;
    },
    _flattenPkgs(rootPkg) {
        return this._buildFlatDeps({ pkgs: [], pkg: rootPkg, isTopLevel: true });
    },
    /**
     * Skip syncing user requested packages by dropping skipped packages from dep chain
     * @param {any} rootPkg
     * @param {any} opts
     * @returns {object[]} pkgs
     */
    _filterPkgs(rootPkg, opts) {
        // ^ @TODO handle this
        if (!opts.skip)
            return rootPkg;
        ['dependencies'].forEach(setKey => {
            const set = values(rootPkg[setKey]);
            set.forEach(pkg => {
                const found = opts.skip.indexOf(pkg.name) > -1;
                if (found) {
                    logger.verbose(`skipping package: ${pkg.name}@${pkg.version}`);
                    delete rootPkg[setKey][pkg.name];
                }
            });
        });
        return rootPkg;
    },
    /**
     * @private
     * @description gets package from local repository
     * @param {string} name
     * @param {string} version
     * @returns Promise
     */
    _getPackage(name, version, registryName) {
        const get = pify(request);
        const base = npm.config.get('ARTIFACTORY_URI');
        const suffix = this._getScopedPkgLocalUriSuffix(name, version);
        const uri = `${base}/api/storage/${registryName}/${suffix}`;
        // logger.verbose(`testing for package "${name}@${version} at ${uri}`)
        return get(uri, this._getRequestHeaders());
    },
    /**
     * @private
     * @description generates headers for request module
     * @returns object headers for request module
     */
    _getRequestHeaders() {
        return { headers: { Authorization: `Basic ${npm.config.get('_auth')}` }, strictSSL: false };
    },
    _getScopedPkgLocalUriSuffix(name, version) {
        const isScopedPkg = name.trim().charAt(0) === '@';
        if (isScopedPkg) {
            const sanScopeName = name.match(/@.+\/(.*$)/)[1];
            return `${name}/-/${sanScopeName}-${version}.tgz`;
        }
        return `${name}/-/${name}-${version}.tgz`;
    },
    /**
     * @private
     * @description logs dryRun if in dryRun mode
     * @param {any} rslt
     * @param {any} pkgs
     * @param {any} opts
     * @returns object[] pkgs
     */
    _handleDryRun(rslt, pkgs, opts) {
        /* istanbul ignore next */
        if (!opts)
            throw new Error('missing opts 😢');
        if (!opts.dryRun)
            return pkgs;
        /* istanbul ignore next */
        const toSync = pkgs.filter(pkg => pkg.action === ACTION_SYNC).map(pkg => `${pkg.name}@${pkg.version}`);
        /* istanbul ignore next */
        const toSkip = pkgs.filter(pkg => pkg.action === ACTION_SKIP).map(pkg => `${pkg.name}@${pkg.version}`);
        const toSyncTxt = this.setToText({ set: toSync, limit: 10, fn: txt => `\t\t${txt}\n` });
        const toSkipTxt = this.setToText({ set: toSkip, limit: 10, fn: txt => `\t\t${txt}\n` });
        logger.info([
            'sync dry run:\n',
            `\tpackages to sync [${toSync.length}]:\n${toSyncTxt}`,
            `\tpackages to skip [${toSkip.length}]:\n${toSkipTxt}`
        ].join(''));
        return pkgs;
    },
    /**
     * convert an array to text.  enables specification of a limit of how many
     * items in the set to convert to text, and truncates in a friendly way,
     * denoting how many items were truncated
     * @param {object} opts
     * @param {array} opts.set
     * @param {number} [opts.limit]
     * @param {function} opts.fn transform function.
     *   convert an array item to text. will be join('')ed with other items
     * @returns string
     */
    setToText({ set, limit, fn }) {
        /* istanbul ignore next */
        if (!set || !fn)
            throw new Error('set & limit required');
        limit = limit || 20;
        const moreTxt = `...[${set.length - limit} more]`;
        return set.length > limit
            ? set.slice(0, limit).map(fn).join('') + fn(moreTxt)
            : set.map(fn).join('');
    },
    /**
     * @private
     * @descrition handle case where packages are resolving from git
     * @param {object[]} pkgs
     */
    _handleGitResolvedPkgs(pkgs) {
        /* istanbul ignore next */
        const names = pkgs.map(p => p.name);
        /* istanbul ignore next */
        let pkgSetText = this.setToText({ set: names, limit: 10, fn: name => `\t${name}\n` });
        /* istanbul ignore next */
        logger.error([
            `attempted to resolve for syncing:\n${pkgSetText}`,
            '\n\n🚧',
            'although npm can resolve git project packages, we have no means to',
            'copy a package tarball from git to npm.  please roll your git dep into a',
            'valid npm package. alternatively, add a `--skip-git-deps` flag to this',
            'project if you would like to proceed knowing the dependency will not',
            'be copied. 🚧'
        ].join(' '));
        /* istanbul ignore next */
        process.exit(1);
    },
    /**
     * @private
     * @descrition handle case where packages have no resolve url
     * @param {object[]} pkgs
     */
    _handleUnresolvedPkgs(pkgs) {
        const names = pkgs.map(p => p.name);
        let pkgSetText = names.length > 10
            ? `${names.slice(0, 10).join(', ')}...[${names.length - 10} more]`
            : names.join(', ');
        logger.warn([
            `packages ${pkgSetText} will not be synced.`,
            `${pkgs.length === 1 ? 'it was' : 'they were'} not resolved`,
            'from a remote repository.'
        ].join(' '));
    },
    _limitPkgs(pkgs, opts) {
        if (opts.limit)
            pkgs = pkgs.filter(pkg => opts.limit.indexOf(pkg.name) > -1);
        return pkgs;
    },
    /**
     * @private
     * @description loads npm
     * @returns Promise
     */
    _loadNpm() {
        return pify(npm.load)({ progress: false, silent: true });
        // ^^ silent does not silence progress, https://github.com/npm/npm/issues/14413
    },
    /**
     * @private
     * @description set module attrs from environment
     * @returns undefined
     */
    _setLocalsFromEnv() {
        try {
            this._destRepoName = npm.config.get('NPM_REGISTRY_DEST').match(/[^\/]*$/)[0];
        }
        catch (err) {
            /* istanbul ignore next */
            throw new Error([
                'unable to extract destination repo name from NPM_REGISTRY_DEST:',
                `${npm.config.get('NPM_REGISTRY_DEST') || 'MISSING'}`
            ].join(' '));
        }
    },
    /**
     * sync all 3rd party external to 3rd party local
     * @param {object} opts
     * @param {boolean} opts.dryRun
     * @returns Promise
     */
    sync(opts) {
        opts = opts || {};
        logger.warn([
            '🚨 this feature is untested, use with caution.',
            'npm registries are not yet operational 🚨'
        ].join(' '));
        return this._loadNpm()
            .then(this._assertEnv.bind(this))
            .then(this._setLocalsFromEnv.bind(this))
            .then(this._listPackages.bind(this))
            .then(rootPkg => this._filterPkgs(rootPkg, opts))
            .then(this._flattenPkgs.bind(this))
            .then(pkgs => this._limitPkgs(pkgs, opts))
            .then(pkgs => pkgs.sort((pA, pB) => {
            const a = pA.name.toLowerCase();
            const b = pB.name.toLowerCase();
            if (a < b)
                return -1;
            if (a > b)
                return 1;
            return 0;
        }))
            .then(pkgs => pkgs.map(p => Object.assign(p, { status: null, action: null })))
            .then(this._tagPackagesToSync.bind(this))
            .then(pkgs => this._syncPackages(pkgs, opts));
    },
    /**
     * @private
     * @descrition Sync individual package from src to dest repository
     * @param {object} pkg
     * @param {string} pkg.name
     * @param {Symbol|null} pkg.status
     * @param {Symbol|null} pkg.action
     * @param {object} opts
     * @param {boolean} opts.dryRun
     * @returns Promise
     */
    _syncPackage(pkg, opts) {
        opts = opts || {};
        /* istanbul ignore next */
        if (!pkg || !pkg.name) {
            if (pkg.status === STATUS_INVALID_RESOLVE_URI) {
                throw new Error([
                    'unable to sync package.  unable to determine URI package downloaded'
                ].join(' '));
            }
            throw new Error([
                'invalid package provided. this is known to occur when your package',
                'state is invalid.  run `npm ls` and make sure it passes without error.'
            ].join(' '));
        }
        if (pkg.action === ACTION_SKIP)
            return Promise.resolve();
        /* istanbul ignore next */
        const handleResponse = ([targetResponse, cacheResponse]) => {
            if (cacheResponse.statusCode !== 200) {
                logger.warn([
                    `package not found in cache: ${pkg.name}@${pkg.version},`,
                    cacheResponse.request.href
                ].join(' '));
                logger.post('cache-miss-packages', `${pkg.name}@${pkg.version}`);
                pkg.status = STATUS_NOT_EXISTS;
                pkg.action = ACTION_SKIP;
                return Promise.resolve();
            }
            if (targetResponse.statusCode === 200) {
                pkg.status = STATUS_EXISTS;
                pkg.action = ACTION_SKIP;
                return Promise.resolve();
            }
            if (targetResponse.statusCode === 404) {
                pkg.action = ACTION_SYNC;
                pkg.status = STATUS_NOT_EXISTS;
                if (opts.dryRun)
                    return Promise.resolve();
                return this._copyPackage(pkg);
            }
            throw new Error(`sync-package [${pkg.name}]: unexpected response ${targetResponse.statusCode}`);
        };
        return Promise.all([
            this._getPackage(pkg.name, pkg.version, npm.config.get('NPM_REGISTRY_DEST')),
            this._getPackage(pkg.name, pkg.version, npm.config.get('NPM_REGISTRY_SRC_CACHE'))
        ])
            .then(handleResponse.bind(this));
    },
    /**
     * @private
     * @description Sync all packages.  Packages are synchronized sequentially.
     * @TODO consider blasting the artifactory API by doing a Promise.all(...)
     * vs. chaining each sync together
     * @param {string[]} pkgs
     * @param {object} opts
     * @param {boolean} opts.dryRun
     * @returns Promise resolves when all packages synced
     */
    _syncPackages(pkgs, opts) {
        opts = opts || {};
        const concurrency = opts.concurrency || 8;
        logger.verbose(`sync concurrency set to ${concurrency}`);
        logger.progressMode = true;
        return bb.map(pkgs, (pkg, ndx) => {
            logger.verbose([
                `${opts.dryRun ? '[dry-run]' : ''}`,
                `syncing package (${pkgs.length - ndx}/${pkgs.length}): ${pkg.name}`
            ].join(' '));
            return this._syncPackage(pkg, opts);
        }, { concurrency })
            .then(() => {
            logger.verbose(`syncing packages: complete\n`);
            logger.progressMode = false;
        })
            .then(r => this._handleDryRun(r, pkgs, opts));
    },
    /**
     * @private
     * @param {*} response
     * @param {*} pkg
     */
    _throwResponseError(response, pkg, copyUri) {
        logger.progressMode = false;
        console.log('\n');
        const body = JSON.parse(response.body);
        if (pkg.name.match('@')) {
            return logger.error(`unable to copy scoped packages due to artifactory bug: ${pkg.name}`);
        }
        throw new Error([
            `sync-package [${pkg.name}]: failed to copy ${copyUri}.\n`,
            `unexpected response: ${response.statusCode}`,
            body.messages.map(m => m.message).join(', '),
            '\n',
            'Local caching may prevent the registry cache from caching packages.',
            'Try `npm cache clear` followed by re-installing packages against the',
            'npm cache in order to populate the cache.  See ripcord.log for a list',
            'of npmjs.org resolved packages.'
        ].join(' '));
    },
    /**
     * @private
     * @description npm ls call. get all package deps
     * @returns Promise
     */
    _listPackages() {
        const ls = pify(npm.commands.ls);
        return ls(null, true);
    }
};
//# sourceMappingURL=sync-packages-to-registry.js.map