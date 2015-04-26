
var babel = require('babel')

module.exports = function (code) {
  return babel.transform(code, {stage: 0}).code.slice('"use strict";\n'.length)
}

