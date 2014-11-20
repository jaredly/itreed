
var extend = require('../../extend')
  , request = require('majax')

  , EventEmitter = require('eventemitter3')
  , CodeMirror = require('codemirror')

module.exports = Rust

function Rust() {
  this.session = 'not-session-based'
  this.status = 'disconnected'
  this.type = 'rust-play'
}

Rust.prototype = extend(Object.create(EventEmitter.prototype), {
  init: function (host, done) {
    this.host = host
    this.status = 'done'
    this.emit('status')
    done()
  },

  disconnect: function () {
  },

  // asyncComplete: false,

  sendShell: function (content, callbacks) {
    callbacks.start()
    request({
      data: JSON.stringify({
        optimize: 0,
        version: 'master',
        code: content,
      }),
      method: 'POST',
      url: 'http://' + this.host,
      type: 'json',
    }, response => {
      if (response.out) {
        callbacks.output({
          type: 'stream',
          stream: 'stdout',
          text: response.out,
        })
      }
      if (response.err) {
        callbacks.output({
          type: 'stream',
          stream: 'stderr',
          text: response.err,
        })
      }
      callbacks.end()
    }, (_, xhr) => {
      try {
        var response = JSON.parse(xhr.responseText)
        callbacks.output({
          type: 'error',
          name: 'CompilerError',
          message: response.error,
          traceback: response.error,
        })
      } catch (e) {
        callbacks.output({
          type: 'error',
          name: 'ConnectionError',
          message: 'Failed to connect',
          traceback: 'Failed to connect',
        })
      }
      callbacks.end()
    })
  },

})

Rust.prototype.constructor = Rust
