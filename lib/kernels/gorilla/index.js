
var request = require('majax')
  , async = require('async')
  , EventEmitter = require('eventemitter3')

  , uuid = require('../../uuid')
  , extend = require('../../extend')

module.exports = Gorilla

function Gorilla(docid) {
  EventEmitter.call(this)
  this._running = {}
  this.status = 'disconnected'
  this.session = null
  this.type = 'gorilla'
}

Gorilla.prototype = extend(Object.create(EventEmitter.prototype), {
  _gotMessage: function (e) {
    var message = JSON.parse(e.data)
    var op;
    if (message.status) {
      op = 'status:' + message.status[0]
      if (message.status[0] === 'done') {
        delete this._running[message.id]
        if (!Object.keys(this._running).length) {
          this.status = 'done'
          this.emit('status')
        }
      }
    }
    if (message.value) op = 'value'
    if (message.out) op = 'out'
    if (message.err) op = 'err'
    console.log('message', message.id + ':' + op, message)
    this.emit(message.id + ':' + op, message)
  },

  interrupt: function () {
    console.warn('NOT IMPLEMENTED');
  },

  /*
  // this doesn't quite work atm due to CORS
  saveWorksheet: function (filename, contents, done) {
    request({
      url: 'http://' + this.host + '/save',
      data: {
        'worksheet-filename': filename,
        'worksheet-data': contents,
      }
    }, (data) => done && done(data))
  },
  */

  disconnect: function () {
    if (this.sock) {
      this.sock.removeEventListener('message')
      this.sock.close()
      this.status = 'disconnected'
      this.emit('status')
      this.sock = null
    }
    this.session = null
    this.emit('session')
  },

  init: function (host, done) {
    var sock
    try {
      sock = new WebSocket('ws://' + host + '/repl')
    } catch (e) {
      this.status = 'error'
      this.emit('status')
      return done(e)
    }
    this.host = host
    this.status = 'connecting'
    this.emit('status')
    sock.addEventListener('open', () => {
      var id = uuid()
      this.send({id: id, op: 'clone'})
      this.once(id + ':status:done', (message) => {
        this.session = message['new-session']
        this.status = 'done'
        this.emit('session')
        this.emit('status')
        done()
      })
    })
    sock.addEventListener('close', () => {
      if (this.status !== 'error') {
        this.status = 'disconnected'
        this.session = null
        this.sock = null
        this.emit('session')
        this.emit('status')
      }
    })
    sock.addEventListener('error', () => {
      this.status = 'error'
      this.emit('status')
    })
    sock.addEventListener('message', this._gotMessage.bind(this))
    this.sock = sock
  },

  send: function (payload) {
    this.sock.send(JSON.stringify(payload))
  },

  sendShell: function (code, callbacks, done) {
    var id = uuid()
    this._running[id] = true
    this.status = 'running'
    this.emit('status')
    this.send({
      code: code,
      op: 'eval',
      session: this.session,
      id: id
    })

    var out = function (message) {
      callbacks.stream && callbacks.stream({
        content: {
          name: 'stdout',
          data: message.out,
        }
      })
    }

    var value = function (message) {
      var value = JSON.parse(JSON.parse(message.value))
      // if it's nil or a variable declaration, we're ok suppressing it
      var suppressable = value.value === 'nil' || value.value.slice(0, 2) === "#'"
      callbacks.pyout && callbacks.pyout({
        suppressable: suppressable,
        content: {
          data: {
            'text/html': value.type === 'html' && value.content,
            'json/vega': value.type === 'vega' && value.content,
            'json/list-like': value.type === 'list-like' && value,
            'json/latex': value.type === 'latex' && value,
            'text/plain': value.value,
          }
        }
      })
    }
    var err = function (message) {
      callbacks.pyerr && callbacks.pyerr({
        content: {
          ename: '',
          evalue: '',
          traceback: [message.err],
        },
      })
    }
    this.on(id + ':out', out)
    this.on(id + ':value', value)
    this.on(id + ':err', err)
    this.once(id + ':status:done', () => {
      this.off(id + ':out', out)
      this.off(id + ':value', value)
      this.off(id + ':err', err)
      done()
    })
  },
})

