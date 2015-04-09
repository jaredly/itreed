
import EventEmitter from 'eventemitter3'

export default class Kernel extends EventEmitter {
  constructor(server, config, docid) {
    this.server = server
    this.config = config
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

