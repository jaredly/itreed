
var getFrame = require('./get-frame')
  , exec = require('./exec')
  , extend = require('../../extend')

  , EventEmitter = require('eventemitter3')

module.exports = JsKernel

function JsKernel(docid) {
  this.frame = getFrame(docid)
  this.w = this.frame.contentWindow
  this.session = this.frame.session

  // TODO status me up?
  this.status = 'done'
  this.type = 'ijs'
}

JsKernel.prototype = extend(Object.create(EventEmitter.prototype), {
  init: function (host, done) {
    done()
  },

  sendShell: function (content, callbacks) {
    exec(content, this.w, callbacks)
  },
})

JsKernel.prototype.constructor = JsKernel
