
var uuid = require('./uuid')
  , jsObj = require('./jsobj')
  , isComplex = require('./is-complex')
  , esprima = require('esprima')
  , escodegen = require('escodegen')
  , globalize = require('./globalize')
  , returnify = require('./returnify')

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

  w._go = function (output, fn, done) {
    if ('function' !== typeof fn) {
      var e = new Error('go takes a function')
      return output({
        type: 'error', 
        name: 'ValueError',
        message: e.message,
        traceback: e.stack
      })
    }
    var id = w.worker._i++;
    w.worker._cbs[id] = {
      done: done,
      out: output
    }
    w.worker.postMessage({
      name: 'go',
      data: {
        id: id,
        what: fn + ''
      }
    })
  }

  w._goEval = function (output, what, done) {
    var id = w.worker._i++;
    w.worker._cbs[id] = {
      done: done,
      out: output
    }
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
    if (data.error) {
      return w.worker._cbs[data.id].out({
        type: 'error',
        name: data.error.name,
        message: data.error.message,
        traceback: data.error.stack,
      })
    }
    if (message.name === 'go') {
      w.worker._cbs[data.id].done.apply(null, data.args)
    } else if (message.name === 'eval') {
      w.worker._cbs[data.id].done.call(null, data.result)
    }
  }

  return frame
}

function makeOutput(value) {
  var out = {
    type: 'output',
    suppressable: false,
    'text/plain': safeString(value),
  }

  if (isComplex(value, [], window)) {
    out['js/obj'] = jsObj.register(value)
  }
  return out
}

function execute(content, window, callbacks) {
  var num = window._ih.length
  window._ih.push(content)
  callbacks.start()

  function output(value) {
    callbacks.output(makeOutput(value))
  }

  window.console = {
    log: function () {
      [].forEach.call(arguments, output)
    },
  }


  var tree = esprima.parse(content)

  // globalize(tree)
  // returnify(tree)

  var body = escodegen.generate(tree)
  /*
    , fn
  try {
    fn = new window.Function('go', 'goEval', 'display', 'console', body)
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
  */

  try {
    var res = fn(
      window._go.bind(null, callbacks.output),
      window._goEval.bind(null, callbacks.output),
      (what) => callbacks.output(makeOutput(what)),
      {
        log: function () {
          callbacks.output(makeOutput([].slice.call(arguments)))
        }
      }
    )
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
    window.___ = window.__
    window.__ = window._
    window._ = res
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


