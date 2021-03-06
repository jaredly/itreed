
var safeString = require('./safe-string')
  , React = require('react')
  , format = require('../../lib/format')

module.exports = function (value, window, mime) {
  if (mime === 'stdout' || mime === 'stderr') {
    return {
      type: 'stream',
      stream: mime,
      text: value + '',
    }
  }
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

