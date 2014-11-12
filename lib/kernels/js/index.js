
var getFrame = require('./get-frame')
  , exec = require('./exec')
  , extend = require('../../extend')

  , EventEmitter = require('eventemitter3')
  , CodeMirror = require('codemirror')

module.exports = JsKernel

function JsKernel(docid) {
  this.frame = getFrame(docid)
  this.frame.style.display = 'block'
  this.w = this.frame.contentWindow
  this.session = this.frame.session

  this.status = 'done'
  this.type = 'ijs'
}

JsKernel.prototype = extend(Object.create(EventEmitter.prototype), {
  init: function (host, done) {
    done()
  },

  asyncComplete: false,

  cmComplete: function (cm) {
    return CodeMirror.hint.javascript(cm, {globalScope: this.w, additionalContext: this.w})
  },

  /*
  complete: function (line, pos, done) {
    var text = line.slice(0, pos)
    var at = text.lastIndexOf(' ')
    if (at !== -1) text = text.slice(at + 1)
    var sep = /[$_\w\.]+$/
    var matches = text.match(sep)
    if (!matches) return false
    if (matches[0][0] === '.') return false
    var parts = matches[0].split('.')
    var last = parts.pop()
    var obj = parts.reduce((obj, attr) => {
      return obj && obj[attr]
    }, this.w)
    if (!obj || !obj.constructor || !obj.constructor.prototype) return false
    var props
    if ('object' === typeof obj) {
      props = Object.getOwnPropertyNames(obj)
    } else {
      props = Object.getOwnPropertyNames(obj.constructor.prototype)
    }
    var needle = last.toLowerCase()
    done(props.filter(item => item.toLowerCase().indexOf(needle) === 0), last)
  },
  */

  teardown: function () {
    this.frame.style.display = 'none'
  },

  sendShell: function (content, callbacks) {
    exec(content, this.w, callbacks)
  },
})

JsKernel.prototype.constructor = JsKernel
