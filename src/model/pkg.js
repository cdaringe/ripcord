"use strict";
const { clone, values } = require('lodash');
/**
 * flatten deps and devDep into key:value pairs where key ~= name;version
 * @param {any} pkgs
 * @returns {any} flatSet new set
 */
function flattenPkgs({ pkgs, flatSet, root }) {
    flatSet = flatSet || {};
    values(pkgs || []).forEach(pkg => {
        const k = key(pkg);
        /* istanbul ignore else */
        if (!flatSet[k]) {
            const tPkg = clone(pkg);
            flatSet[k] = tPkg;
            delete tPkg.dependencies;
        }
        flattenPkgs({ pkgs: pkg.dependencies, flatSet, root: false });
    });
    return flatSet;
}
exports.flattenPkgs = flattenPkgs;
function key(pkg) { return `${pkg.name};${pkg.version}`; }
exports.key = key;
//# sourceMappingURL=pkg.js.map