
var extend = require('../../extend')
  , request = require('majax')

  , EventEmitter = require('eventemitter3')
  , CodeMirror = require('codemirror')

module.exports = Go

function Go() {
  this.session = 'not-session-based'
  this.status = 'disconnected'
  this.type = 'go'
}

Go.prototype = extend(Object.create(EventEmitter.prototype), {
  init: function (host, done) {
    this.host = host
    request({
      url: 'http://' + this.host
    }, response => {
      if (response.status === 'running' && response.lang === 'go') {
        this.status = 'done'
        this.emit('status')
        done()
      } else {
        done('Invalid server response')
      }
    }, xhr => {
      done('Failed to connect')
    })
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
      if (response.stdout) {
        callbacks.output({
          type: 'stream',
          stream: 'stdout',
          text: response.stdout,
        })
      }
      if (response.stderr) {
        callbacks.output({
          type: 'stream',
          stream: 'stderr',
          text: response.stderr,
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

Go.prototype.constructor = Go
