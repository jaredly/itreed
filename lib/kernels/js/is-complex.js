
var getAllProperties = require('./get-all-properties')

module.exports = isComplex

function isComplex(value, path) {
  if (path.indexOf(value) !== -1) return true
  var npath = path.concat([value])
  if (Array.isArray(value)) {
    return value.some(sub => isComplex(sub, npath))
  }

  if ('function' === typeof value) return false
  if ('object' === typeof value && value) {
    if (Object.getPrototypeOf(Object.getPrototypeOf(value))) {
      return true
    }
    return getAllProperties(value).some(key => isComplex(value[key], npath))
  }

  return false
}

