/**
 * build and publish developer api docs to a project's github pages
 * @module docs
 * @private
 */
"use strict";
const path = require('path');
const cp = require('child_process');
const ghpages = require('gh-pages');
const rmdir = (path) => { try {
    cp.execSync(`rm -rf ${path}`);
}
catch (e) { } };
const counsel = require('counsel');
const pify = require('pify');
const jsdocBin = require('resolve-jsdoc-bin');
const logger = require('./logger');
let jsdocBinFilename = jsdocBin.resolve(__dirname);
module.exports = {
    _clean() {
        const { dest } = this._getDocsMetaData();
        return rmdir(dest);
    },
    _getDocsMetaData() {
        return {
            jsdocConfigFilename: path.resolve(__dirname, '..', 'assets', 'jsdoc.json'),
            projectReadmeFilename: path.resolve(counsel.targetProjectRoot, 'README.md'),
            sourceDirname: path.resolve(counsel.targetProjectRoot, 'src'),
            dest: path.resolve(counsel.targetProjectRoot, 'docs'),
            projectRootDirname: counsel.targetProjectRoot,
            templateDirname: path.dirname(require.resolve('minami'))
        };
    },
    _ghPublish: pify(ghpages.publish),
    /**
     * build api docs, crash hard if invalid!
     * @TODO do things async. come on.
     * @param {any} opts
     * @returns Promise
     */
    build(opts) {
        try {
            const { jsdocConfigFilename, projectReadmeFilename, dest, sourceDirname, projectRootDirname, templateDirname } = this._getDocsMetaData();
            const cmd = jsdocBinFilename;
            const args = [
                '--configure', jsdocConfigFilename,
                '--recurse',
                '--readme', projectReadmeFilename,
                '--template', templateDirname,
                '--destination', dest,
                sourceDirname
            ];
            this._clean();
            let rslt = cp.spawnSync(cmd, args, { cwd: projectRootDirname });
            /* istanbul ignore next */
            if (rslt.error)
                throw rslt.error;
            /* istanbul ignore next */
            if (rslt.stdout.length)
                console.log(rslt.stdout.toString());
            /* istanbul ignore next */
            if (rslt.stderr.length)
                throw new Error(rslt.stderr.toString());
        }
        catch (err) {
            /* istanbul ignore next */
            logger.error(err.message);
            process.exit(1);
        }
        return Promise.resolve();
    },
    publish(opts) {
        const { dest } = this._getDocsMetaData();
        return this._ghPublish(dest)
            .then(() => this._clean())
            .then(() => console.log('docs successfully published'));
    }
};
//# sourceMappingURL=docs.js.map