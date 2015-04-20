/**
 * Create iframes for sandboxedish execution contexts.
 */

var _frames = {}
  , uuid = require('../../lib/uuid')

const NODE = typeof window === 'undefined'

module.exports = getContext;

function getContext(id) {
  if (!_frames[id]) {
    _frames[id] = newContext()
  }
  return _frames[id]
}

getContext.clear = function (id) {
  _frames[id] = null
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

function newContext() {
  let ctx
  if (NODE) {
    ctx = vm.createContext({})
  } else {
    let frame = document.createElement('iframe')
    frame.className = 'm_IPython_js_frame'
    frame.session = uuid()
    document.body.appendChild(frame)
    ctx = frame.contentWindow

    ctx.showFrame = function () {
      frame.classList.add('show')
    }
    ctx.hideFrame = function () {
      frame.classList.remove('show')
    }
  }
  ctx._ih = []
  ctx._oh = {}
  ctx.jsx = require('./jsx')

  // live updating

  // from user -> frame
  ctx._liveLocal = {}
  ctx._sendLive = function (id, args) {
    if (!ctx._liveLocal[id]) return
    ctx._liveLocal[id].forEach(fn => fn.apply(null, args))
  }

  // from frame -> user
  ctx._liveCB = {}
  ctx.sendLive = function (lid, value) {
    if (!ctx._liveCB[lid]) return
    ctx._liveCB[lid].forEach(fn => fn(value))
  }

  ctx._loadCSS = function (window, output, filenames, done) {
    output = output || ctx._output
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

  ctx._loadJS = function (window, output, filenames, done) {
    output = output || ctx._output
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

  ctx._inject_css = ''
  ctx.addInjectCSS = function (text) {
    ctx._inject_css += '\n' + text
    ctx._inject_listeners.forEach(fn => fn(ctx._inject_css))
  }
  ctx.clearInjectCSS = function () {
    ctx._inject_css = ''
    ctx._inject_listeners.forEach(fn => fn(ctx._inject_css))
  }
  ctx._inject_listeners = [];
  ctx.addInjectListener = function (fn) {
    if (ctx._inject_listeners.indexOf(fn) !== -1) return
    ctx._inject_listeners.push(fn)
  }
  ctx.removeInjectListener = function (fn) {
    if (ctx._inject_listeners) {
      var ix = ctx._inject_listeners.indexOf(fn)
      if (ix === -1) return false
      ctx._inject_listeners.splice(ix, 1)
    }
  }

  ctx.Isolate = require('./isolate')
  ctx.Stater = require('./stater')
  ctx.React = require('react')
  ctx.ajax = require('./ajax')

  if (!NODE && window.Worker && window.location.protocol !== 'file:') {
    // Async things
    ctx.worker = initWorker(window)
    ctx.lworker = initWorker(ctx)
    ctx.restartLWorker = function () {
      if (ctx.lworker) ctx.lworker.terminate()
      ctx.lworker = initWorker(ctx)
    }
    ctx.restartWorker = function () {
      if (ctx.worker) ctx.worker.terminate()
      ctx.worker = initWorker(window)
    }

    ctx._work = function (worker, output, fn) {
      output = output || ctx._output
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

    ctx._wwEval = function (worker, output, what, done, onerr) {
      var id = worker._i++;
      worker._cbs[id] = {
        done: done,
        onerr: onerr,
        out: output || ctx._output
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
    ctx._work = function () {throw new Error('Webworkers not supported in this browser')}
    ctx._wwEval = function () {throw new Error('Webworkers not supported in this browser')}
  }

  ctx.work = ctx._work.bind(null, ctx.worker, null)
  ctx.lwork = ctx._work.bind(null, ctx.lworker, null)
  ctx.wwEval = ctx._wwEval.bind(null, ctx.worker, null)
  ctx.lwwEval = ctx._wwEval.bind(null, ctx.lworker, null)
  ctx.loadJS = ctx._loadJS.bind(null, ctx, null)
  ctx.loadCSS = ctx._loadCSS.bind(null, ctx, null)
  ctx.loadParentCSS = ctx._loadCSS.bind(null, ctx.parent, null)

  return ctx
}

