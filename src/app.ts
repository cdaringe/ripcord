require('perish')
Error.stackTraceLimit = 100
const bb = require('bluebird')
bb.config({ longStackTraces: true })

export const logLevel : string = 'info'
export const pkgId : string = [
  't', // s
  'r', // t
  'i', // r
  'p', // 8
  'w', // B
  'i', // a
  'r', // l
  'e', // l
  'I', // i
  'd'  // n
].join('')
