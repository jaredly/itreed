
var request = require('majax')
  , async = require('async')
  , EventEmitter = require('eventemitter3')

  , uuid = require('./uuid')
  , extend = require('./extend')

module.exports = Kernel

function Kernel(docid, username) {
  EventEmitter.call(this)
  this.username = username || 'username'
  this.status = 'disconnected'
  this.session_id = docid
  this.ssession = uuid()
  this.pseudo_filename = this.session_id
  this.type = 'ipython'
}

Kernel.prototype = extend(Object.create(EventEmitter.prototype), {
  useKernel: function (kernel, done) {
    this.kernel = kernel.id
    this.session = this.kernel + this.session_id
    this.emit('session')
    this.setupSockets(() => {
      this.status = 'done'
      this.emit('status')
      done && done()
    })
  },

  interrupt: function () {
    request({
      url: 'http://' + this.host + '/api/kernels/' + this.kernel + '/interrupt',
      method: 'POST',
    }, () => console.log('Interrupted!'))
  },

  newKernel: function (done) {
    request({
      data: JSON.stringify({notebook: {name: this.pseudo_filename, path: ""}}),
      url: 'http://' + this.host + '/api/sessions',
      method: 'POST',
      type: 'json',
    }, (session) => {
      this.useKernel(session.kernel, done)
    }, (error) => {
      this.status = 'error'
      this.emit('status')
      done(new Error("Failed to start a new session"))
    })
  },

  init: function (host, done) {
    this.host = host
    this.status = 'connecting'
    this.emit('status')
    request({
      url: 'http://' + host + '/api/sessions',
      method: 'GET',
      type: 'json',
    }, (sessions) => {
      var matches = sessions.filter(session => {
        return session.notebook.name === this.session_id
      })
      if (matches.length) {
        this.available_kernels = matches
        this.status = 'available-kernels'
        this.emit('status')
        return done()
      }
      this.newKernel(done)
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

  sendShell: function (content, callbacks) {
    this._sendShell(content, {
      pyout: (m) => {
        var data = m.content.data
        data.type = 'output'
        data.suppressable = m.suppressable
        callbacks.output(data)
      },
      stream: (m) => callbacks.output({
        type: 'stream',
        stream: m.content.name,
        text: m.content.data,
      }),
      pyerr: (m) => callbacks.output({
        type: 'error',
        name: m.content.ename,
        message: m.content.evalue,
        traceback: m.content.traceback,
      }),
      display_data: (m) => {
        var data = m.content.data
        data.type = 'display'
        data.metadata = m.content.metadata,
        data.suppressable = m.suppressable
        callbacks.output(data)
      },
      status: (m) => {
        if (m.content.execution_state !== 'busy') return
        callbacks.start()
      },
    }, callbacks.end)
  },

  _sendShell: function (code, callbacks, done) {
    var id = uuid()
    this._send('shell', {
      header: {
        msg_id: id,
        msg_type: 'execute_request',
        session: this.ssession,
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

    var check = function (message) {
      if (message.content.status !== 'aborted') return
      for (var name in callbacks) {
        this.off(id + ':' + name, callbacks[name])
      }
      this.off(id + ':status', finisher)
      this.off(id + ':execute_reply', check)
      this.status = 'done'
      this.emit('status')
      done && done(message)
    }
    this.on(id + ':execute_reply', check)

    var finisher = function (message) {
      if (message.content.execution_state === 'busy') {
        this.status = 'running'
        this.emit('status')
        return
      }
      if (message.content.execution_state !== 'idle') return
      for (var name in callbacks) {
        this.off(id + ':' + name, callbacks[name])
      }
      this.off(id + ':status', finisher)
      this.off(id + ':execute_reply', check)
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

  newSocket: function (endpoint, onMessage, done) {
    var sock = new WebSocket('ws://' + this.host + '/api/kernels/' + this.kernel + '/' + endpoint)
    sock.addEventListener('open', () => {
      sock.send(this.ssession + ':no_cookies=wat')
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


