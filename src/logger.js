const chalk = require('chalk');
const readline = require('readline');
/**
 * @module logger
 * @description provide colorified console-only logging interface
 */
/* istanbul ignore next */
module.exports = {
    _logLevel: 2,
    /**
     * @property progressMode
     * @type boolean
     * @description all stdout writes will clear current line and write back into
     * it. toggle it ad-hoc to use for a progress bar.
     */
    progressMode: false,
    /**
     * set the log level, using npm world-style log levels
     * @param {string} level ['error', 'warn', 'info', 'verbose', 'debug']
     */
    setLogLevel(level) {
        if (level.toLowerCase() === 'silent') {
            this._logLevel = -1;
            return;
        }
        const levels = ['error', 'warn', 'info', 'verbose', 'debug'];
        this._logLevel = levels.indexOf(level);
        if (this._logLevel === -1) {
            throw new Error([
                `could not find matching log level for: ${level}.`,
                `valid levels: ${levels.join(', ')}`
            ].join(' '));
        }
    },
    /**
     * @param {...any} args
     * @returns undefined
     */
    error(...args) {
        if (this._logLevel === 0)
            return;
        this._log('stderr', chalk.bold.red, ...args);
    },
    /**
     * @param {...any} args
     * @returns undefined
     */
    warn(...args) {
        if (this._logLevel < 1)
            return;
        this._log('stdout', chalk.yellow, ...args);
    },
    /**
     * @param {...any} args
     * @returns undefined
     */
    info(...args) {
        if (this._logLevel < 2)
            return;
        this._log('stdout', chalk.blue, ...args);
    },
    /**
     * @param {...any} args
     * @returns undefined
     */
    verbose(...args) {
        if (this._logLevel < 3)
            return;
        this._log('stdout', chalk.bold.cyan, ...args);
    },
    /**
     * @param {...any} args
     * @returns undefined
     */
    debug(...args) {
        if (this._logLevel < 3)
            return;
        this._log('stdout', chalk.bold.cyan, ...args);
    },
    /**
     * @private
     */
    _log(streamName, colorFn, ...args) {
        if (this._logLevel === -1)
            return;
        if (streamName === 'stderr') {
            ;
            [...args].forEach(msg => console.error(colorFn(msg)));
            return;
        }
        if (this.progressMode) {
            readline.clearLine(process.stdout);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(args[0]);
            return;
        }
        console.log.apply(console, [...args].map(msg => colorFn(msg)));
    }
};
//# sourceMappingURL=logger.js.map