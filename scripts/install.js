"use strict";
const cp = require('child_process');
const path_1 = require('path');
const counsel_1 = require('counsel');
try {
    const root = counsel_1.project.findProjectRoot(path_1.resolve(__dirname, '..', '..'));
    cp.exec('node bin/ripcord.js counsel apply', { cwd: path_1.resolve(__dirname, '..') });
    console.log('[ripcord] install success');
}
catch (err) {
    console.warn([
        'unable to install ripcord rules. if this was a global install, fear not',
        `and proceed. ${err.message}`
    ].join(' '));
}
//# sourceMappingURL=install.js.map