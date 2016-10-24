'use strict'

const path = require('path')
const counsel = require('counsel')
const fs = require('fs')

/**
 * @private
 * @description bin specific post processing of report command
 */
const postProcess = function (action, result) {
  const output = action.options.output
  let resultJson = JSON.stringify(result, null, 2)
  /* istanbul ignore next */
  if (output) {
    const reportName = postProcess.REPORT_NAME_DEFAULT
    let dest = path.isAbsolute(output) ? output : path.resolve(process.cwd(), output)
    dest = counsel.project.isDir(dest) ? path.join(dest, reportName) : dest
    fs.writeFileSync(dest, resultJson)
  } else {
    process.stdout.write(resultJson)
  }
}
postProcess.REPORT_NAME_DEFAULT = 'tw-dependencies.json'

module.exports = postProcess
