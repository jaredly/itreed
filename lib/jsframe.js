
module.exports = {
  newFrame: newFrame,
  getFrame: getFrame,
  execute: execute,
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

  function output(value) {
    var out = {
      type: 'output',
      suppressable: false,
      'text/plain': safeString(valueres),
    }

    if (isComplex(value)) {
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
      trackback: e.stack
    })
    callbacks.end()
    return
  }

  window._oh[num] = res
  output(res)
  callbacks.end()
}

function safeString(res) {
  try {
    return JSON.stringify(res, null, 2) + ''
  } catch (e) { }
  try {
    return res + ''
  } catch (e) { }
  return '<cannot display object>'
}

function isComplex(value, path) {
  if (path.indexOf(value) !== -1) return true
  var npath = path.concat([value])
  if (Array.isArray(value)) {
    return value.some(sub => isComplex(sub, npath))
  }

  if ('object' === typeof value) {
    if (value.constructor !== Object) {
      return true
    }
    return Object.keys(value).some(key => isComplex(value[key], npath))
  }

  return false
}


