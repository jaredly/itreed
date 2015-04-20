
import uuid from '../../lib/uuid'
import Kernel from '../lib/kernel'

export default class JupyterKernel extends Kernel {

  init(done) {
    this.status = 'connecting'
    this.emit('status')
    this.server.getKernel(this.docid, this.config.profile, (err, kernel) => {
      if (err) return done(err)
      this.kernel = kernel
      this.session = kernel
      this.setupSocket(done)
    })
  }

  restart(done) {
    this.server.restart(this.kernel, err => {
      if (err) return done(err)
      this.setupSocket(done)
    })
  }

  interrupt(done) {
    this.server.interrupt(this.kernel, done)
  }

  shutdown(done) {
    this.server.shutdown(this.kernel, done)
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
    }
    this.status = 'disconnected'
    this.emit('status')
    this.session = null
    this.emit('session')
  }

  complete(lineText, pos, done) {
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
        code: lineText,
        cursor_pos: pos.ch,
      },
      metadata: {},
      parent_header: {},
    })

    var response = function (message) {
      this.off(id + ':complete_reply', response)
      if (message.content.status !== 'ok' || !message.content.matches.length) return done()
      done({
        list: message.content.matches,
        from: {line: pos.line, ch: message.content.cursor_start},
        to: {line: pos.line, ch: message.content.cursor_end},
      })
    }
    this.on(id + ':complete_reply', response)
  }

  onLive(lid, handler) {
    this.on(lid + ':live_update', message => {
      handler(message.content)
    })
  }

  sendLive(lid) {
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
  }

  sendShell(content, env, callbacks) {
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
  }

  _send(where, payload) {
    payload.channel = where
    this.socket.send(JSON.stringify(payload))
  }

  _onChannel(e) {
    var message = JSON.parse(e.data)
    this.emit(message.parent_header.msg_id + ':' + message.msg_type, message)
    if (message.msg_type === 'shutdown_reply' && !message.content.restart) {
      this.disconnect()
    }
  }

  setupSocket(done) {
    this.server.getSocket(this.kernel, this.docid, (err, socket) => {
      if (err) return done(err)
      this.socket = socket
      this.status = 'connected'
      this.emit('status')
      socket.addEventListener('message', this._onChannel.bind(this))

      socket.addEventListener('close', () => {
        if (this.status !== 'error') {
          this.status = 'disconnected'
          this.session = null
          this.emit('session')
          this.emit('status')
        }
      })

      socket.addEventListener('error', () => {
        this.status = 'error'
        this.emit('status')
      })

      done(null)
    })
  }

  _sendShell(code, callbacks, done) {
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

    let replied = false
    let statused = false

    var status = function (message) {
      if (message.content.execution_state === 'busy') {
        this.status = 'running'
        this.emit('status')
        return
      }
      if (message.content.execution_state === 'idle') {
        statused = true
        if (replied) finishUp.call(this)
      }
    }

    var finishUp = function () {
      // if (message.content.status === 'aborted') return 
      for (var name in callbacks) {
        this.off(id + ':' + name, callbacks[name])
      }
      this.off(id + ':status', status)
      this.off(id + ':execute_reply', reply)
      this.status = 'done'
      this.emit('status')
      done && done()
    }

    var reply = function (message) {
      if (message.content.payload &&
          message.content.payload.length) {
        // console.log(message.content.payload)
        for (var i=0; i<message.content.payload.length; i++) {
          // TODO: account for HTML response, etc.
          let data = message.content.payload[i].data
          data['text/ansi'] = data['text/plain']
          callbacks['pyout']({content: {data: data}})
        }
      }
      replied = true
      if (statused) finishUp.call(this)
    }

    this.on(id + ':status', status)
    this.on(id + ':execute_reply', reply)
  }

}

