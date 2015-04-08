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

function initWorker(window) {
  var worker = new window.Worker('/bootworker.js')
  worker._cbs = {}
  worker._i = 0

  worker.onmessage = function (evt) {
    var message = evt.data
      , data = message.data
    if (data.error) {
      worker._cbs[data.id].out({
        type: 'error',
        name: data.error.name,
        message: data.error.message,
        traceback: data.error.stack,
      })
      worker._cbs[data.id].onerr && worker._cbs[data.id].onerr()
      return
    }
    if (message.name === 'out') {
      worker._cbs[data.id].out({
        type: 'output',
        'text/plain': JSON.stringify(data.display, null, 2)
      })
      return
    }
    if (message.name === 'go') {
      worker._cbs[data.id].fns[data.fn].apply(null, data.args)
    } else if (message.name === 'eval') {
      worker._cbs[data.id].done.call(null, data.result)
    }
  }
  return worker
}

function newFrame() {
  var frame = document.createElement('iframe')
  frame.className = 'm_IPython_js_frame'
  frame.session = uuid()
  document.body.appendChild(frame)
  var w = frame.contentWindow
  w._ih = []
  w._oh = {}
  w.jsx = require('./jsx')
  w.esprima = require('jstransform/node_modules/esprima-fb')

  // live updating

  // from user -> frame
  w._liveLocal = {}
  w._sendLive = function (id, args) {
    if (!w._liveLocal[id]) return
    w._liveLocal[id].forEach(fn => fn.apply(null, args))
  }

  // from frame -> user
  w._liveCB = {}
  w.sendLive = function (lid, value) {
    if (!w._liveCB[lid]) return
    w._liveCB[lid].forEach(fn => fn(value))
  }

  w._loadCSS = function (window, output, filenames, done) {
    output = output || w._output
    if (!Array.isArray(filenames)) {
      filenames = [filenames]
    }
    filenames.forEach(src => {
      var node = window.document.createElement('link')
      node.href = src
      node.rel='stylesheet'
      node.onload = function () {
        output({'text/plain': "loaded css! " + src})
      }
      window.document.head.appendChild(node)
    })
  }

  w._loadJS = function (window, output, filenames, done) {
    output = output || w._output
    if (!Array.isArray(filenames)) {
      filenames = [filenames]
    }
    filenames.forEach(src => {
      var node = window.document.createElement('script')
      node.src = src
      node.onload = function () {
        output({'text/plain': "loaded js! " + src})
      }
      window.document.head.appendChild(node)
    })
  }

  w._inject_css = ''
  w.addInjectCSS = function (text) {
    w._inject_css += '\n' + text
    w._inject_listeners.forEach(fn => fn(w._inject_css))
  }
  w.clearInjectCSS = function () {
    w._inject_css = ''
    w._inject_listeners.forEach(fn => fn(w._inject_css))
  }
  w._inject_listeners = [];
  w.addInjectListener = function (fn) {
    if (w._inject_listeners.indexOf(fn) !== -1) return
    w._inject_listeners.push(fn)
  }
  w.removeInjectListener = function (fn) {
    if (w._inject_listeners) {
      var ix = w._inject_listeners.indexOf(fn)
      if (ix === -1) return false
      w._inject_listeners.splice(ix, 1)
    }
  }

  w.Isolate = require('./isolate')
  w.Stater = require('./stater')
  w.React = require('react')
  w.ajax = require('./ajax')

  w.showFrame = function () {
    frame.classList.add('show')
  }
  w.hideFrame = function () {
    frame.classList.remove('show')
  }

  if (window.Worker && window.location.protocol !== 'file:') {
    // Async things
    w.worker = initWorker(window)
    w.lworker = initWorker(w)
    w.restartLWorker = function () {
      if (w.lworker) w.lworker.terminate()
      w.lworker = initWorker(w)
    }
    w.restartWorker = function () {
      if (w.worker) w.worker.terminate()
      w.worker = initWorker(window)
    }

    w._work = function (worker, output, fn) {
      output = output || w._output
      if ('function' !== typeof fn) {
        var e = new Error('work takes a function')
        return output({
          type: 'error', 
          name: 'ValueError',
          message: e.message,
          traceback: e.stack
        })
      }

      return function () {
        var args = [].slice.call(arguments)
        var fns = {}
        for (var i=0; i<args.length; i++) {
          if ('function' === typeof args[i]) {
            fns[i] = args[i]
            args[i] = null
          }
        }
        var id = worker._i++;
        worker._cbs[id] = {
          fns: fns,
          out: output
        }
        worker.postMessage({
          name: 'go',
          data: {
            id: id,
            fns: Object.keys(fns),
            args: args,
            what: fn + ''
          }
        })
      }
    }

    w._wwEval = function (worker, output, what, done, onerr) {
      var id = worker._i++;
      worker._cbs[id] = {
        done: done,
        onerr: onerr,
        out: output || w._output
      }
      worker.postMessage({
        name: 'eval',
        data: {
          id: id,
          text: what + ''
        }
      })
    }
  } else {
    w._work = function () {throw new Error('Webworkers not supported in this browser')}
    w._wwEval = function () {throw new Error('Webworkers not supported in this browser')}
  }

  w.work = w._work.bind(null, w.worker, null)
  w.lwork = w._work.bind(null, w.lworker, null)
  w.wwEval = w._wwEval.bind(null, w.worker, null)
  w.lwwEval = w._wwEval.bind(null, w.lworker, null)
  w.loadJS = w._loadJS.bind(null, w, null)
  w.loadCSS = w._loadCSS.bind(null, w, null)
  w.loadParentCSS = w._loadCSS.bind(null, window, null)

  return frame
}

