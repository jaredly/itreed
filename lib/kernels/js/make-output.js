
var safeString = require('./safe-string')
  , React = require('treed/node_modules/react')
  , format = require('../../plugin/format')

module.exports = function (value, window, mime) {
  var out = format.format(value, window)
  if (mime) {
    out[mime] = value
  }

  out.type = 'output'
  out.suppressable = false
  if (!out['text/plain']) {
    out['text/plain'] = safeString(value)
  }

  return out
}

