
var babel = require('babel')

module.exports = function (code) {
  return babel.transform(code).code.slice('"use strict";\n'.length)
}

