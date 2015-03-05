
var babel = require('babel')

module.exports = function (code) {
  return babel.transform(code).code.slice('"use strict";\n'.length)
}

/*
var transform       = require('jstransform').transform;
var reactTransform  = require('reactify/node_modules/react-tools').transform;
var visitors        = require('reactify/node_modules/react-tools/vendor/fbtransform/visitors');

module.exports = function (code) {
  var transformers = visitors.getAllVisitors()
  transformers = require('jstransform/visitors/es6-destructuring-visitors').visitorList.concat(transformers)
  return transform(transformers, PRAGMA + code).code
}
*/
