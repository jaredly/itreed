
var jsframe = require('./jsframe')
  , EventEmitter = require('eventemitter3')
  , extend = require('./extend')

module.exports = JsKernel

function JsKernel(docid) {
  this.frame = jsframe.getFrame(docid)
  this.w = this.frame.contentWindow
  this.num  = this.w._ih.length
  this.status = 'connected'
  this.type = 'ijs'
}

JsKernel.prototype = extend(Object.create(EventEmitter.prototype), {
  init: function (host, done) {
    done()
  },

  sendShell: function (content, callbacks) {
    jsframe.execute(content, this.w, callbacks)
  },
})

JsKernel.prototype.constructor = JsKernel
