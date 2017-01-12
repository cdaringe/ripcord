"use strict";
const path_1 = require('path');
const counsel_1 = require('counsel');
const index_1 = require('../src/index');
Promise.resolve()
    .then(() => counsel_1.project.findProjectRoot(path_1.resolve(__dirname, '..', '..')))
    .catch(err => {
    console.warn([
        'unable to install ripcord rules. if this was a global install, fear not',
        `and proceed. ${err.message}`
    ].join(' '));
    process.exit(0);
})
    .then(() => {
    index_1.default.logger.setLogLevel('verbose');
    return index_1.default.counsel('apply', null);
})
    .then(() => index_1.default._counsel.logger.info('install success'));
//# sourceMappingURL=install.js.map