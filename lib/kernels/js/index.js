
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

  teardown: function () {
    this.frame.style.display = 'none'
  },

  onLive: function (lid, handler) {
    if (!this.w._liveCB[lid]) {
      this.w._liveCB[lid] = [handler]
    } else if (this.w._liveCB[lid].indexOf(handler) === -1) {
      this.w._liveCB[lid].push(handler)
    }
  },

  sendLive: function (lid) {
    this.w._sendLive(lid, [].slice.call(arguments, 1))
  },

  sendShell: function (content, callbacks) {
    exec(content, this.w, callbacks)
  },
})

JsKernel.prototype.constructor = JsKernel
