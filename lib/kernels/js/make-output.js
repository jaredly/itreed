
var jsObj = require('./jsobj')
  , isComplex = require('./is-complex')
  , safeString = require('./safe-string')

module.exports = function (value, mime) {
  var out = {
    type: 'output',
    suppressable: false,
    'text/plain': safeString(value),
  }

  if (mime) {
    out[mime] = value
  }

  if (isComplex(value, [], window)) {
    out['js/obj'] = jsObj.register(value)
  }
  return out
}

