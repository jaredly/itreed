
import Kernel from '../lib/kernel'
import exec from './exec'


export default class JsKernel extends Kernel {
  init(done) {
    this.ctx = this.server.getContext(this.docid)
    this.session = this.server.getSession(this.docid)

    this.status = 'done'
    this.emit('status')
    this.emit('session')
    done()
  }

  shutdown(done) {
    this.server.shutdown(this.docid, done)
  }

  cmComplete(cm) {
    return CodeMirror.hint.javascript(cm, {
      globalScope: this.ctx,
      additionalContext: this.ctx
    })
  }

  teardown() {
    this.ctx.hideFrame && this.ctx.hideFrame()
  }

  onLive(lid, handler) {
    if (!this.ctx._liveCB[lid]) {
      this.ctx._liveCB[lid] = [handler]
    } else if (this.ctx._liveCB[lid].indexOf(handler) === -1) {
      this.ctx._liveCB[lid].push(handler)
    }
  }

  sendLive(lid) {
    this.ctx._sendLive(lid, [].slice.call(arguments, 1))
  }

  sendShell(content, evt, callbacks) {
    exec(content, evt, this.ctx, callbacks)
  }
}


