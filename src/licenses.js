"use strict";
const counsel = require('counsel');
const pkg_1 = require('./model/pkg');
const path = require('path');
const pify = require('pify');
const checker = pify(require('license-checker'));
const logger = require('./logger');
const fs = require('fs');
const json2csv = require('json2csv');
const _ = require('lodash');
const values = _.values;
const keyBy = _.keyBy;
const get = _.get;
const uiBuild = require('./ui-build');
const report = require('./report');
const readFile = pify(fs.readFile);
const readJSON = (filename) => (readFile(filename).then(s => JSON.parse(s)));
const WHITELIST = [
    /public domain/ig,
    /MIT.*/,
    'BSD',
    'ISC',
    'WTFPL'
];
module.exports = {
    _appendDevPackages(prdPkgs, opts) {
        // if (!opts.dev) return prdPkgs
        const devOverride = Object.assign(opts, { production: false, development: true });
        return this._getLicenses(devOverride)
            .then(devPkgs => Object.assign(devPkgs, prdPkgs));
    },
    _appendFields({ pkgs, production }) {
        /* istanbul ignore if */
        if (!pkgs || !Object.keys(pkgs).length)
            return pkgs;
        for (let nameVersion in pkgs) {
            const pkg = pkgs[nameVersion];
            // tidy name, version
            const components = nameVersion.match(/(.*)@(.*)/);
            const name = components[1];
            const version = components[2];
            // tidy publisher
            /* istanbul ignore if */
            if (Array.isArray(pkg.publisher))
                pkg.publisher = pkg.publisher.join(';');
            // split licenses to n-license fields
            const licenseKVs = typeof pkg.licenses === 'string'
                ? { 'license1': pkg.licenses }
                : pkg.licenses.reduce((set, l, ndx) => Object.assign(set, { [`license${ndx + 1}`]: l }), {});
            Object.assign(pkg, { name, version, production }, licenseKVs);
            // purge commas to assert well behaved csv
            const permittedNonStrFields = ['licenses', 'production'];
            for (var field in pkg) {
                if (permittedNonStrFields.indexOf(field) === -1) {
                    // licenses field is type array, and is a special case
                    // that is handled pre-export (if exporting!)
                    pkg[field] = pkg[field].replace(/,/g, ';');
                }
            }
        }
        return pkgs;
    },
    /**
     * license-checker returns strings or arrays for licenses.  obnoxious. tidy it!
     * @private
     * @param {object[]} pkgs
     * @returns object[] pkgs
     */
    _cleanLicenseCheckerOutput(pkgs) {
        for (let name in pkgs) {
            let pkg = pkgs[name];
            pkg.licenses = Array.isArray(pkg.licenses) ? pkg.licenses : [pkg.licenses];
        }
        return pkgs;
    },
    /**
     * Get dependency set
     * @param {any} opts
     * @param {any} ripcord
     * @returns {object} pkgs : IPkgSet
     */
    getLicenses(opts, ripcord) {
        opts = opts || {};
        const isUiBuild = opts.uiBuild;
        opts.uiBuild = false;
        // ^ get deps _first_ sans web transform. after we merge our license info into
        // our package tree, then webtransform
        const licensePkgsP = this._getLicenses(opts) // @TODO, tidy API.  take opts.licenseOpts or something, not the app level opts
            .then(prdPkgs => this._appendDevPackages(prdPkgs, opts))
            .then(pkgs => this._cleanLicenseCheckerOutput(pkgs));
        opts.retainUnused = true;
        return Promise.all([licensePkgsP, report.getDependencies(opts)])
            .then(([lPkgs, pkgs]) => {
            opts.uiBuild = isUiBuild;
            return this._mergeLicensesToPkgSet(lPkgs, pkgs);
        })
            .then(pkgs => uiBuild.applyWebBuildTransform(pkgs, opts));
    },
    _getLicenses(opts) {
        opts = opts || {};
        const projectRoot = opts.targetProjectRoot || counsel.targetProjectRoot;
        const DEFAULT_CONFIG = {
            start: projectRoot
        };
        const config = Object.assign(DEFAULT_CONFIG, { production: true }, opts);
        return Promise.all([
            checker.init(config),
            readJSON(path.join(projectRoot, 'package.json'))
        ])
            .then(([pkgs, pkgJSON]) => {
            // filter out current package
            delete pkgs[`${pkgJSON.name}@${pkgJSON.version}`];
            return pkgs;
        })
            .then(pkgs => this._appendFields({ pkgs, production: !!config.production }));
    },
    _checkLicenses(pkgs, opts, ripcord) {
        const pkg = counsel.targetProjectPackageJson;
        /* istanbul ignore next */
        if (!Object.keys(pkgs).length)
            return;
        const flatPkgs = pkg_1.flattenPkgs({ pkgs, flatSet: {}, root: true });
        for (let name in flatPkgs) {
            /* istanbul ignore next */
            if (this._hasWhitelistedLicense(flatPkgs[name]))
                delete flatPkgs[name];
        }
        const errMsg = `${pkg.name} has unapproved licenses`;
        const rptText = opts.csv ? this._reportToCSV(flatPkgs) : JSON.stringify(flatPkgs, null, 2);
        // delete pkg.licenses // @TODO ??
        /* istanbul ignore next */
        if (opts.output) {
            this._writeReport(Object.assign({ txt: rptText, basename: 'license-check', ripcord }, opts));
        }
        else {
            logger.error(`${errMsg}:\n`);
            logger.error(rptText); // stream report to stderr
        }
        /* istanbul ignore else */
        if (opts.throwOnFail)
            throw new Error(errMsg);
        /* istanbul ignore next */
        process.exit(1);
    },
    _hasWhitelistedLicense(pkg) {
        if (!pkg.licenses || !pkg.licenses.length)
            return false;
        return pkg.licenses.some(lic => {
            return WHITELIST.some(wLic => {
                return lic.match(wLic);
            });
        });
    },
    /**
     * apply license checker metadata into our standard dependency report dependency
     * set (IPkgSet)
     * @param {any} lPkgs license package set
     * @param {IPkgSet} pkgs
     * @returns {IPkgSet}
     */
    _mergeLicensesToPkgSet(lPkgs, pkgs) {
        const flatPkgs = pkg_1.flattenPkgs({ pkgs, flatSet: null, root: true });
        const keyedLPkgs = keyBy(lPkgs, lPkg => pkg_1.key(lPkg));
        for (let lKey in keyedLPkgs) {
            let pkg = flatPkgs[lKey];
            /* istanbul ignore next */
            if (!flatPkgs[lKey]) {
                throw new Error([
                    `unable to to find ${lKey} in pkg deps.`,
                    'this is known to happen if manual adjustments have been made to your',
                    'node_modules directory or if a non-npm package manager has been',
                    'used, such as yarn'
                ].join(' '));
            }
            Object.assign(pkg, keyedLPkgs[lKey]);
            delete pkg.license; // in favor of .license1, ..., .licenseN + .licenses
        }
        return pkgs;
    },
    /**
     * check target project for valid licenses.
     * on invalid licenses, generate a report
     * @param {object} opts
     * @param {string} opts.output filename, dirname (relative or absolute)
     * @param {string} opts.webpackConfig filename, webpack config
     * @param {boolean} opts.csv output file in csv mode (otherwise json)
     * @param {boolean} opts.throwOnFail throws, vs process.exit(1) on fail. hook for testing.
     * @param {module} ripcord
     * @returns Promise
     */
    check(opts, ripcord) {
        opts = opts || {};
        const pkg = counsel.targetProjectPackageJson;
        const isDevOnly = !!get(pkg, `${counsel.configKey}.devOnly`);
        /* istanbul ignore next */
        if (isDevOnly && !opts.force) {
            logger.info('devOnly, waiving license check');
            return Promise.resolve();
        }
        return this.getLicenses(opts, ripcord)
            .then(pkgs => this._checkLicenses(pkgs, opts, ripcord));
    },
    dump(opts, ripcord) {
        opts = opts || {};
        opts.exclude = null; // @TODO tidy API. do opts.licenseOpts.exclude null, or somethin'! yuck!
        return this.getLicenses(opts, ripcord)
            .then((pkgs) => {
            if (!Object.keys(pkgs).length)
                return;
            const flatPkgs = pkg_1.flattenPkgs({ pkgs, flatSet: {}, root: true });
            values(flatPkgs).forEach(pkg => { delete pkg.licenses; });
            const dumpTxt = opts.csv ? this._reportToCSV(flatPkgs) : JSON.stringify(flatPkgs, null, 2);
            /* istanbul ignore else */
            if (opts.output) {
                this._writeReport(Object.assign({ txt: dumpTxt, basename: 'license-dump', ripcord }, opts));
            }
            else {
                logger.info(dumpTxt); // stream report to stderr
            }
        });
    },
    _reportToCSV(pkgs) {
        for (let name in pkgs) {
            const pkg = pkgs[name];
            for (let propName in pkg) {
                let prop = pkg[propName];
                if (pkg.hasOwnProperty(propName)) {
                    if (Array.isArray(prop))
                        prop = prop.join(';');
                    else if (['boolean', 'number'].indexOf(typeof prop) > -1)
                        prop = prop.toString();
                    prop = prop.replace(/,/g, ';');
                    pkg[propName] = prop;
                }
            }
        }
        return json2csv({ data: values(pkgs), quotes: '' });
    },
    _writeReport({ txt, ripcord, basename, output, csv }) {
        const defaultFilename = `${basename}.${(csv ? 'csv' : 'json')}`;
        const dest = ripcord._getDest(output, defaultFilename);
        fs.writeFileSync(dest, txt);
        logger.info(`license report written to: ${dest}`);
    }
};
//# sourceMappingURL=licenses.js.map