"use strict";
const cp = require('child_process');
const path_1 = require('path');
const counsel_1 = require('counsel');
const exec = pify(cp.exec);
Promise.resolve()
    .then(() => counsel_1.project.findProjectRoot(path_1.resolve(__dirname, '..', '..')))
    .catch(err => {
    console.warn([
        'unable to install ripcord rules. if this was a global install, fear not',
        `and proceed. ${err.message}`
    ].join(' '));
    process.exit(0);
})
    .then(() => exec('node bin/ripcord.js counsel apply', { cwd: path_1.resolve(__dirname, '..') }))
    .then(() => console.log('[ripcord] install success'));
//# sourceMappingURL=install.js.map