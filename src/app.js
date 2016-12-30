"use strict";
require('perish');
Error.stackTraceLimit = 100;
const bb = require('bluebird');
bb.config({ longStackTraces: true });
exports.logLevel = 'info';
exports.pkgId = [
    't',
    'r',
    'i',
    'p',
    'w',
    'i',
    'r',
    'e',
    'I',
    'd' // n
].join('');
//# sourceMappingURL=app.js.map