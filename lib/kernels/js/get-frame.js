/**
 * Create iframes for sandboxedish execution contexts.
 */

var _frames = {}
  , uuid = require('../../uuid')

module.exports = getFrame;

function getFrame(id) {
  if (!_frames[id]) {
    _frames[id] = newFrame()
  }
  return _frames[id]
}


function newFrame() {
  var frame = document.createElement('iframe')
  frame.session = uuid()
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

