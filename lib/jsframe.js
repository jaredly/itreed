
var uuid = require('./uuid')
  , jsObj = require('./jsobj')
  , isComplex = require('./is-complex')

module.exports = {
  newFrame: newFrame,
  getFrame: getFrame,
  execute: execute,
  session: uuid(),
  isComplex: isComplex,
}

var _frames = {}

function getFrame(id) {
  if (!_frames[id]) {
    _frames[id] = newFrame()
  }
  return _frames[id]
}

function newFrame() {
  var frame = document.createElement('iframe')
  document.body.appendChild(frame)
  var w = frame.contentWindow
  w._ih = []
  w._oh = {}
  return frame
}

function execute(content, window, callbacks) {
  var num = window._ih.length
  window._ih.push(content)
  callbacks.start()

  function output(value) {
    var out = {
      type: 'output',
      suppressable: false,
      'text/plain': safeString(value),
    }

    if (isComplex(value, [])) {
      out['js/obj'] = jsObj.register(value)
    }
    callbacks.output(out)
  }

  window.console = {
    log: function () {
      [].forEach.call(arguments, output)
    },
  }

  try {
    var res = window.eval(content)
  } catch (e) {
    callbacks.output({
      type: 'error',
      name: e.name,
      message: e.message,
      traceback: e.stack
    })
    callbacks.end()
    return
  }

  window._oh[num] = res
  output(res)
  callbacks.end()
}

function safeString(res) {
  if ('undefined' === typeof res) return 'undefined'
  if ('number' === typeof res && isNaN(res)) return 'NaN'
  try {
    return JSON.stringify(res, null, 2) || res + ''
  } catch (e) { }
  try {
    return res + ''
  } catch (e) { }
  return '<cannot display object>'
}


