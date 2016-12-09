'use strict'

const dummyPkgFn = require('dummy-pkg')
const dummyPkgUsedDepFn = require('dummy-pkg-used-dep')
const beep = require('./beep')

console.log(dummyPkgFn(), dummyPkgUsedDepFn(), process.env.NODE_ENV, beep.bop())
