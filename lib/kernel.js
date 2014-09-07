
var request = require('majax')
  , async = require('async')
  , EventEmitter = require('eventemitter3')

  , uuid = require('./uuid')
  , extend = require('./extend')

module.exports = Kernel

function Kernel(host, path, username) {
  EventEmitter.call(this)
  this.host = host
  this.path = path
  this.session_id = uuid()
  this.username = username || 'username'
}

Kernel.prototype = extend(Object.create(EventEmitter.prototype), {
  init: function (done) {
    async.parallel({
      notebook: (next) => request({
        url: 'http://' + this.host + '/api/notebooks/' + this.path,
        type: 'json',
      }, (data) => next(null, data)),

      session: (next) => request({
        url: 'http://' + this.host + '/api/sessions',
        type: 'json',
      }, (sessions) => next(null, sessions[0]))

    }, (err, data) => {
      this.kernel = data.session.kernel.id
      this.setupSockets(() => done(data.notebook))
    })
  },

  setupSockets: function (done) {
    async.parallel({
      stdin: next => this.newSocket('stdin', this._onStdin, next),
      shell: next => this.newSocket('shell', this._onShell, next),
      iopub: next => this.newSocket('iopub', this._onIO, next),
    }, (err, sockets) => {
      this.sockets = sockets
      done()
    })
  },

  sendShell: function (code, callbacks, done) {
    var id = uuid()
    this._send('shell', {
      header: {
        msg_id: id,
        msg_type: 'execute_request',
        session: this.session_id,
        username: this.username,
      },
      content: {
        allow_stdin: !!callbacks.stdin,
        code: code,
        silent: false,
        store_history: true,
        user_expressions: {},
        user_variables: [],
      },
      metadata: {},
      parent_header: {},
    })
    for (var name in callbacks) {
      console.log('list', id + ':' + name)
      this.on(id + ':' + name, callbacks[name])
    }

    var finisher = function (message) {
      if (message.content.execution_state !== 'idle') return
      for (var name in callbacks) {
        this.off(id + ':' + name, callbacks[name])
      }
      this.off(id + ':status', finisher)
      done && done(message)
    }
    this.on(id + ':status', finisher)
  },

  _send: function (where, payload) {
    this.sockets[where].send(JSON.stringify(payload))
  },

  // TODO: merge these?

  // input_request
  _onStdin: function (e) {
    var message = JSON.parse(e.data)
    this.emit(message.parent_header.msg_id + ':' + message.msg_type, message)
  },

  // execute_reply, kernel_info_reply
  _onShell: function (e) {
    var message = JSON.parse(e.data)
    this.emit(message.parent_header.msg_id + ':' + message.msg_type, message)
  },

  // status, pyin, pyout, pyerr
  _onIO: function (e) {
    var message = JSON.parse(e.data)
    // console.log('io', message, message.parent_header.msg_id, message.msg_type)
    this.emit(message.parent_header.msg_id + ':' + message.msg_type, message)
  },

  newSocket: function (endpoint, onMessage, done) {
    var sock = new WebSocket('ws://' + this.host + '/api/kernels/' + this.kernel + '/' + endpoint)
    sock.addEventListener('open', () => {
      sock.send(this.session_id + ':no_cookies=wat')
      done(null, sock)
    })
    sock.addEventListener('message', onMessage.bind(this))
  },
})
Kernel.prototype.constructor = Kernel


