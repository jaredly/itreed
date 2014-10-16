
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
  w.worker = new Worker('/bootworker.js')
  w.worker._cbs = {}
  w.worker._i = 0

  w.go = function (something, done) {
    var id = w.worker._i++;
    w.worker._cbs[id] = done
    w.worker.postMessage({
      name: 'go',
      data: {
        id: id,
        what: something + ''
      }
    })
  }

  w.goEval = function (what, done) {
    var id = w.worker._i++;
    w.worker._cbs[id] = done
    w.worker.postMessage({
      name: 'eval',
      data: {
        id: id,
        text: what + ''
      }
    })
  }

  w.worker.onmessage = function (evt) {
    var message = evt.data
      , data = message.data
    if (message.name === 'go') {
      w.worker._cbs[data.id].apply(null, data.args)
    } else if (message.name === 'eval') {
      w.worker._cbs[data.id].call(null, data.error, data.result)
    }
  }

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

    if (isComplex(value, [], window)) {
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

  if (undefined !== res) {
    window._oh[num] = res
  }
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


