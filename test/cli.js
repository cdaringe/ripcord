"use strict";
const path = require("path");
const bin = path.join(__dirname, '../bin/ripcord.js');
const cp = require('child_process');
const tape = require('tape');
tape('cli - bogus cmd', t => {
    const noArgRun = cp.spawnSync(bin);
    if (noArgRun.error) {
        t.fail(`unable to run test. ${noArgRun.error.message}`);
        return t.end();
    }
    t.equals(noArgRun.status, 1, 'exits w/ 1 on invalid cmd');
    t.end();
});
tape('cli - valid cmd', t => {
    const helpRun = cp.spawnSync(bin, ['--log-level', 'verbose', 'counsel', 'check']);
    if (helpRun.error) {
        t.fail(`unable to run test. ${helpRun.error.message}`);
        return t.end();
    }
    t.equals(helpRun.status, 0, 'exits w/ 1 on invalid cmd');
    t.end();
});
//# sourceMappingURL=cli.js.map