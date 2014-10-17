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

  w._work = function (output, fn, done) {
    if ('function' !== typeof fn) {
      var e = new Error('work takes a function')
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

  w._wwEval = function (output, what, done, onerr) {
    var id = w.worker._i++;
    w.worker._cbs[id] = {
      done: done,
      onerr: onerr,
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
      w.worker._cbs[data.id].out({
        type: 'error',
        name: data.error.name,
        message: data.error.message,
        traceback: data.error.stack,
      })
      w.worker._cbs[data.id].onerr && w.worker._cbs[data.id].onerr()
      return
    }
    if (message.name === 'go') {
      w.worker._cbs[data.id].done.apply(null, data.args)
    } else if (message.name === 'eval') {
      w.worker._cbs[data.id].done.call(null, data.result)
    }
  }

  return frame
}

