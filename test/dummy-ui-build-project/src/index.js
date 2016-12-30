'use strict'

const dummyPkgFn = require('dummy-pkg')
const dummyPkgUsedDepFn = require('dummy-pkg-used-dep')
const dummyPkgUsedTwice = require('dummy-pkg-used-twice')
const beep = require('./beep')

console.log(dummyPkgFn(), dummyPkgUsedDepFn(), dummyPkgUsedTwice(), process.env.NODE_ENV, beep.bop())
