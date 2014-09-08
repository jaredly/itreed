
var request = require('majax')
  , async = require('async')
  , EventEmitter = require('eventemitter3')

  , uuid = require('./uuid')
  , extend = require('./extend')

module.exports = Gorilla

function Gorilla(host, path, username) {
  EventEmitter.call(this)
  this.host = host
  this.path = path
  this.username = username || 'username'
}

Gorilla.prototype = extend(Object.create(EventEmitter.prototype), {
  init: function (done) {
    this.newSocket(() => done())
  },
  _gotMessage: function (e) {
    var message = JSON.parse(e.data)
    var op;
    if (message.status) op = 'status:' + message.status[0]
    if (message.value) op = 'value'
    if (message.out) op = 'out'
    if (message.err) op = 'err'
    console.log('message', message.id + ':' + op, message)
    this.emit(message.id + ':' + op, message)
  },

  saveWorksheet: function (filename, contents, done) {
    request({
      url: 'http://' + this.host + '/save',
      data: {
        'worksheet-filename': filename,
        'worksheet-data': contents,
      }
    }, (data) => done && done(data))
  },

  newSocket: function (done) {
    var sock = new WebSocket('ws://' + this.host + '/repl')
    sock.addEventListener('open', () => {
      var id = uuid()
      this.send({id: id, op: 'clone'})
      this.once(id + ':status:done', (message) => {
        this.session = message['new-session']
        done()
      })
    })
    sock.addEventListener('message', this._gotMessage.bind(this))
    this.sock = sock
  },

  send: function (payload) {
    this.sock.send(JSON.stringify(payload))
  },

  sendShell: function (code, callbacks, done) {
    var id = uuid()
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

