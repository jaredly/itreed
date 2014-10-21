
var jsObj = require('./jsobj')
  , isComplex = require('./is-complex')
  , safeString = require('./safe-string')
  , React = require('treed/node_modules/react')

module.exports = function (value, mime) {
  var out = {
    type: 'output',
    suppressable: false,
    'text/plain': safeString(value),
  }

  if (mime) {
    out[mime] = value
  }

  if (React.isValidComponent(value)) {
    out['js/react'] = jsObj.register(value)
  } else if (isComplex(value, [], window)) {
    out['js/obj'] = jsObj.register(value)
  }
  return out
}

