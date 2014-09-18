
var request = require('majax')
  , async = require('async')
  , EventEmitter = require('eventemitter3')

  , uuid = require('./uuid')
  , extend = require('./extend')

module.exports = Kernel

function Kernel(username) {
  EventEmitter.call(this)
  /*
  this.host = host
  this.path = path
  */
  this.username = username || 'username'
  this.status = 'disconnected'
  this.session_id = uuid()
  this.pseudo_filename = uuid()
  this.session = null
  this.type = 'ipython'
}

Kernel.prototype = extend(Object.create(EventEmitter.prototype), {
  init: function (host, done) {
    this.host = host
    this.status = 'connecting'
    this.emit('status')
    request({
      data: JSON.stringify({notebook: {name: this.pseudo_filename, path: ""}}),
      url: 'http://' + host + '/api/sessions',
      method: 'POST',
      type: 'json',
    }, (session) => {
      this.kernel = session.kernel.id
      this.session = this.kernel + this.session_id
      this.emit('session')
      this.setupSockets(() => {
        this.status = 'done'
        this.emit('status')
        done()
      })
    }, (error) => {
      this.status = 'error'
      this.emit('status')
      done(new Error("Failed to start a new session"))
    })

    /*
    async.parallel({
      notebook: (next) => request({
        url: 'http://' + this.host + '/api/notebooks/' + this.path,
        type: 'json',
      }, (data) => next(null, data)),
    }, (err, data) => {
    })
    */
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

  disconnect: function () {
    for (var name in this.sockets) {
      this.sockets[name].close()
    }
    this.sockets = null
    this.status = 'disconnected'
    this.emit('status')
    this.session = null
    this.emit('session')
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
    this.status = 'running'
    this.emit('status')
    for (var name in callbacks) {
      this.on(id + ':' + name, callbacks[name])
    }

    var finisher = function (message) {
      if (message.content.execution_state !== 'idle') return
      for (var name in callbacks) {
        this.off(id + ':' + name, callbacks[name])
      }
      this.off(id + ':status', finisher)
      this.status = 'done'
      this.emit('status')
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
    this.emit(message.parent_header.msg_id + ':' + message.msg_type, message)
    if (message.msg_type === 'shutdown_reply' && !message.content.restart) {
      this.disconnect()
    }
  },

  closeSockets: function () {
    for (var name in this.sockets) {
    }
  },

  newSocket: function (endpoint, onMessage, done) {
    var sock = new WebSocket('ws://' + this.host + '/api/kernels/' + this.kernel + '/' + endpoint)
    sock.addEventListener('open', () => {
      sock.send(this.session_id + ':no_cookies=wat')
      done(null, sock)
    })
    sock.addEventListener('close', () => {
      if (this.status !== 'error') {
        this.status = 'disconnected'
        this.session = null
        this.emit('session')
        this.emit('status')
      }
    })
    sock.addEventListener('error', () => {
      this.status = 'error'
      this.emit('status')
    })
    sock.addEventListener('message', onMessage.bind(this))
  },
})
Kernel.prototype.constructor = Kernel


