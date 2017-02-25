"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const ripcord = require('../'); // include to bootstrap ripcord constants
const tape = require('tape');
const docs = require('../src/docs');
const fs = require('fs');
const sinon = require('sinon');
tape('generates & publishes docs', t => {
    t.plan(3);
    const outputDirname = path.join(__dirname, '../docs');
    const stub = sinon.stub(docs, '_ghPublish').returns(Promise.resolve());
    return Promise.resolve()
        .then(() => docs._clean())
        .then(() => ripcord.docs(null, { publish: false }))
        .then(() => t.ok(fs.existsSync(outputDirname), 'docs generated'))
        .then(() => docs.publish())
        .then(() => t.ok(stub.calledOnce, 'published called once'))
        .then(stub.restore)
        .then(() => t.pass('docs teardown ok'))
        .then(t.end, t.end);
});
//# sourceMappingURL=docs.js.map