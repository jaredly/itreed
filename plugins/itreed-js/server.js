
import Server from '../lib/server'
import uuid from '../../lib/uuid'
import getContext from './get-context'

const sessions = {}

const SPECS = {
  default: 'js',
  kernelspecs: {
    js: {
      spec: {
        display_name: 'Javascript',
        language: 'javascript',
      }
    }
  }
}

export default class JsServer extends Server {
  init(done) {
    done(null, SPECS)
  }

  static getSpecs(config, done) {
    done(null, SPECS)
  }

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

