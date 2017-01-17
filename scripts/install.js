"use strict";
const path_1 = require('path');
const counsel_1 = require('counsel');
const ripcord = require('../src/index');
Promise.resolve()
    .then(() => counsel_1.project.findProjectRoot(path_1.resolve(__dirname, '..', '..')))
    .catch(err => {
    // if ENOPKG detected, assume global install or uninitialized package.
    // proceed gracefully, vs crash.
    if (err.code !== 'ENOPKG')
        throw err;
    if (!process.env.npm_config_global) {
        // ^^ handle yarn too? https://github.com/yarnpkg/yarn/issues/2472
        console.warn([
            'unable to install ripcord rules. if this was a global install, fear not',
            `and proceed. ${err.message}`
        ].join(' '));
    }
})
    .then(rootPath => {
    if (typeof rootPath !== 'string')
        return; // do no rule application if we found no project
    ripcord._counsel.setTargetPackageMeta();
    ripcord.logger.setLogLevel('verbose');
    return ripcord.counsel('apply', null);
})
    .then(() => ripcord._counsel.logger.info('install success'));
//# sourceMappingURL=install.js.map