
var request = require('majax')
  , async = require('async')
  , EventEmitter = require('eventemitter3')

  , uuid = require('../../uuid')
  , extend = require('../../extend')

module.exports = Kernel

function Kernel(docid, username, language) {
  EventEmitter.call(this)
  this.username = username || 'username'
  this.status = 'disconnected'
  this.session_id = docid
  this.ssession = uuid()
  this.pseudo_filename = this.session_id
  this.type = 'ipython'
  this.language = language
  this.profile = {
    python: 'python2',
    ipyhton: 'python2',
    julia: 'julia 0.3',
  }[language]
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

  asyncComplete: true,

  complete: function (line, pos, done) {
    var id = uuid()
    this._send('shell', {
      header: {
        msg_id: id,
        msg_type: 'complete_request',
        session: this.ssession,
        username: this.username,
        version: '5.0',
      },
      content: {
        code: line,
        /*
        text: '',
        line: line.slice(0, pos.ch),
        block: null,
        */
        cursor_pos: pos.ch,
      },
      metadata: {},
      parent_header: {},
    })

    var response = function (message) {
      this.off(id + ':complete_reply', response)
      if (message.content.status !== 'ok' || !message.content.matches.length) return
      done({
        list: message.content.matches,
        from: {line: pos.line, ch: message.content.cursor_start},
        to: {line: pos.line, ch: message.content.cursor_end},
        /*
        from: {line: pos.line, ch: pos.ch - message.content.matched_text.length},
        to: pos,
        */
      })
    }
    this.on(id + ':complete_reply', response)
  },

  interrupt: function () {
    request({
      url: 'http://' + this.host + '/api/kernels/' + this.kernel + '/interrupt',
      method: 'POST',
    }, () => console.log('Interrupted!'))
  },

  newKernel: function (done) {
    request({
      data: JSON.stringify({
        notebook: {
          name: this.pseudo_filename, path: ""
        },
        kernel: {
          id: null,
          name: this.profile,
        },
      }),
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
        return session.notebook.name === this.session_id && sessions.kernel.name === this.profile
      })
      if (matches.length > 1) {
        this.available_kernels = matches
        this.status = 'available-kernels'
        this.emit('status')
        return done()
      }
      if (matches.length == 1) {
        return this.useKernel(matches[0].kernel, done)
      }
      this.newKernel(done)
    }, (error) => {
      this.status = 'error'
      this.emit('status')
      console.log('connection error: ', error)
      done(new Error('failed to connect'))
    })
  },

  setupSockets: function (done) {
    this.newSocket('channels', this._onChannel, (err, socket) => {
      if (err) return done(err)
      this.socket = socket
      done()
    })
    /*
    async.parallel({
      stdin: next => this.newSocket('stdin', this._onStdin, next),
      shell: next => this.newSocket('shell', this._onShell, next),
      iopub: next => this.newSocket('iopub', this._onIO, next),
    }, (err, sockets) => {
      this.sockets = sockets
      done()
    })
    */
  },

  disconnect: function () {
    if (this.socket) {
      this.socket.close()
    }
    /*
    for (var name in this.sockets) {
      this.sockets[name].close()
    }
    this.sockets = null
    */
    this.status = 'disconnected'
    this.emit('status')
    this.session = null
    this.emit('session')
  },

  onLive: function (lid, handler) {
    this.on(lid + ':live_update', message => {
      handler(message.content)
    })
  },

  sendLive: function (lid) {
    this._send('shell', {
      header: {
        msg_id: uuid(),
        msg_type: 'live_update',
        version: '5.0',
      },
      content: {args: [].slice.call(arguments, 1)},
      metadata: {},
      parent_header: {
        msg_id: lid,
      },
    })
  },

  sendShell: function (content, callbacks) {
    // TODO should I have a pluginable hook for output preprocessing?
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
        text: m.content.text,
      }),
      error: (m) => callbacks.output({
        type: 'error',
        name: m.content.ename,
        message: m.content.evalue,
        format: 'ansi',
        traceback: m.content.traceback,
      }),
      execute_result: (m) => {
        var data = m.content.data
        data.type = 'display'
        data.metadata = m.content.metadata,
        data.suppressable = m.suppressable
        callbacks.output(data)
      },
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
        version: '5.0',
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

    var status = function (message) {
      if (message.content.execution_state === 'busy') {
        this.status = 'running'
        this.emit('status')
        return
      }
    }

    var finisher = function (message) {
      if (message.content.payload &&
          message.content.payload.length) {
        for (var i=0; i<message.content.payload.length; i++) {
          // TODO: account for HTML response, etc.
          let data = message.content.payload[i].data
          data['text/ansi'] = data['text/plain']
          callbacks['pyout']({content: {data: data}})
        }
      }
      // if (message.content.status === 'aborted') return 
      for (var name in callbacks) {
        this.off(id + ':' + name, callbacks[name])
      }
      this.off(id + ':status', status)
      this.off(id + ':execute_reply', finisher)
      this.status = 'done'
      this.emit('status')
      done && done(message)
    }

    this.on(id + ':status', status)
    this.on(id + ':execute_reply', finisher)
  },

  _send: function (where, payload) {
    payload.channel = where
    this.socket.send(JSON.stringify(payload))
    // this.sockets[where].send(JSON.stringify(payload))
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
    this.emit(message.msg_type, message)
    if (message.msg_type === 'shutdown_reply' && !message.content.restart) {
      this.disconnect()
    }
  },

  _onChannel: function (e) {
    var message = JSON.parse(e.data)
    this.emit(message.parent_header.msg_id + ':' + message.msg_type, message)
  },

  newSocket: function (endpoint, onMessage, done) {
    var sock = new WebSocket('ws://' + this.host + '/api/kernels/' + this.kernel + '/' + endpoint + '?session_id=' + this.session_id)
    sock.addEventListener('open', () => {
      sock.send(JSON.stringify({
        header: {
          msg_id: uuid(),
          username: 'username',
          session: this.session_id,
          msg_type: 'kernel_info_request',
          version: '5.0',
        },
        metadata: {},
        content: {},
        buffers: {},
        parent_header: {},
        channel: 'shell',
      }))
      // sock.send(this.ssession + ':no_cookies=wat')
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


