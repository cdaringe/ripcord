"use strict";
const path = require('path');
const depUtil = require('../src/dep-util');
const ripcord = require('../'); // include to bootstrap ripcord constants
const tape = require('tape');
const fs = require('fs');
const sinon = require('sinon');
tape('getFirstFile', t => {
    t.test('finds a file', t => {
        t.plan(1);
        return depUtil.getFirstFile([
            path.resolve(__dirname, 'totally-bogus-file'),
            __filename,
        ])
            .then(result => t.equals(result, __filename, 'returns correct file'));
    });
    t.test('returns null on no file found', t => {
        t.plan(2);
        return Promise.resolve()
            .then(() => depUtil.getFirstFile([]))
            .then(result => t.equals(result, null, 'returns null on no file found'))
            .then(() => depUtil.getFirstFile([path.resolve(__dirname, 'totally-bogus-file')]))
            .then(result => t.equals(result, null, 'returns null on no file found'));
    });
});
//# sourceMappingURL=dep-util.js.map