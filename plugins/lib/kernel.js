
import EventEmitter from 'eventemitter3'

export default class Kernel extends EventEmitter {
  constructor(server, config, docid) {
    super()
    this.server = server
    this.config = config || {}
    this.status = 'disconnected'
    this.docid = docid
  }

  init(done) {
  }

  restart(done) {
  }

  interrupt(done) {
  }

  onLive(lid, handler) {
  }

  sendLive(lid) {
  }

  sendShell(content, env, callback) {
  }
}

