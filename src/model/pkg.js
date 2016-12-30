"use strict";
const { clone, values } = require('lodash');
/**
 * flatten deps and devDep into key:value pairs where key ~= name;version.
 * this function is atrocious. it should be ashamed of itself. and me! i'm sorry,
 * other guy/girl.
 * @param {any} pkgs
 * @returns {any} flatSet new set
 */
function flattenPkgs({ pkgs, flatSet, root }) {
    flatSet = flatSet || {};
    if (!pkgs)
        return flatSet;
    if (pkgs.__ripcordFlatSet)
        return pkgs.__ripcordFlatSet; // @HACK, is flatSet already
    for (let pkgName in pkgs) {
        if (pkgName.indexOf(';') > -1)
            return pkgs; // @HACK, is flatSet already
        const pkg = pkgs[pkgName];
        let directConsumer = null;
        let consumerTaggedRequestedVersion = null;
        if (pkg.from)
            directConsumer = pkg.from[pkg.from.length - 2];
        if (pkg.requestedVersion)
            consumerTaggedRequestedVersion = `${pkg.requestedVersion} (${directConsumer})`;
        const _key = key(pkg);
        const flatPkg = flatSet[_key];
        /* istanbul ignore else */
        if (!flatPkg) {
            // do the flattening!
            const tPkg = clone(pkg);
            if (tPkg.requestedVersion)
                tPkg.requestedVersion = consumerTaggedRequestedVersion;
            if (tPkg.from)
                tPkg.from = tPkg.from.join('>');
            flatSet[_key] = tPkg;
            delete tPkg.dependencies;
        }
        else if (!flatPkg._ripcord_hasBeenAddedAsSecondary) {
            flatPkg.author = flatPkg.author || pkg.author;
            // ^^ HACK @TODO FIGURE IT OUT
            // add additional from reference, as this pkg was depended on from multiple parents
            if (flatPkg.from)
                flatPkg.from = `${flatPkg.from}; ${pkg.from.join('>')}`;
            if (flatPkg.requestedVersion)
                flatPkg.requestedVersion = `${consumerTaggedRequestedVersion}; ${flatPkg.requestedVersion}`;
            flatPkg._ripcord_hasBeenAddedAsSecondary = true;
        }
        flattenPkgs({ pkgs: pkg.dependencies, flatSet, root: false });
    }
    if (root) {
        for (let key in flatSet) {
            let pkg = flatSet[key];
            delete pkg._ripcord_hasBeenAddedAsSecondary;
        }
        if (!pkgs.__ripcordFlatSet) {
            Object.defineProperty(pkgs, '__ripcordFlatSet', {
                set() { return; },
                get() { return flatSet; },
                enumerable: false
            });
        }
    }
    return flatSet;
}
exports.flattenPkgs = flattenPkgs;
function key(pkg) { return `${pkg.name};${pkg.version}`; }
exports.key = key;
//# sourceMappingURL=pkg.js.map