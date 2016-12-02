'use strict'

const fs = require('fs')
const ripcord = require('../')

/**
 * @private
 * @description bin specific post processing of report command
 */
const postProcess = function (action, result) {
  const output = action.options.output
  let resultJson = JSON.stringify(result, null, 2)
  /* istanbul ignore next */
  if (output) {
    const defaultBasename = postProcess.REPORT_NAME_DEFAULT
    let dest = ripcord._getDest(output, defaultBasename)
    fs.writeFileSync(dest, resultJson)
  } else {
    process.stdout.write(resultJson)
  }
}
postProcess.REPORT_NAME_DEFAULT = 'tw-dependencies.json'

module.exports = postProcess
