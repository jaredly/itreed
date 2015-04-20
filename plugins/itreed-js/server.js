
import Server from '../lib/server'
import uuid from '../../lib/uuid'
import getContext from './get-context'

const sessions = {}

export default class JsServer extends Server {
  getContext(docid) {
    return getContext(docid)
  }

  getSession(docid) {
    if (!sessions[docid]) {
      sessions[docid] = uuid()
    }
    return sessions[docid]
  }

  shutdown(docid, done) {
    getContext.clear(docid)
    done()
  }
}

