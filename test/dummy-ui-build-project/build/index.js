/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict'

	const dummyPkgFn = __webpack_require__(2)
	const dummyPkgUsedDepFn = __webpack_require__(4)
	const dummyPkgUsedTwice = __webpack_require__(5)
	const beep = __webpack_require__(6)

	console.log(dummyPkgFn(), dummyPkgUsedDepFn(), dummyPkgUsedTwice(), ("production"), beep.bop())


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	const usedDepFn = __webpack_require__(3)
	module.exports = function () {
	  console.log('dummy-pkg')
	  usedDepFn()
	}


/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = function () {
	  console.log('dummy-pkg-used-dep-0.0.1')
	}


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	const dummyPkgUsedTwice = __webpack_require__(5)
	module.exports = function () {
	  dummyPkgUsedTwice()
	  console.log('dummy-pkg-used-dep-0.0.2')
	}


/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = function () {
	  console.log('dummy-pkg-used-twice')
	}


/***/ },
/* 6 */
/***/ function(module, exports) {

	module.exports = {
	  bop () {
	    return 'bop'
	  }
	}


/***/ }
/******/ ]);