
import uuid from '../../lib/uuid'
import Server from '../lib/server'
import {get, post, del} from './ajax'

export default class JupyterServer extends Server {
  constructor(config) {
    super(config)
  }

  static getSpecs(config, done) {
    get(`http://${config.host}/api/kernelspecs`, done)
  }

  init(done) {
    get(`http://${this.config.host}/api/kernelspecs`, (err, specs) => {
      if (err) {
        console.warn('Error getting kernel specs', err)
        return done(new Error('Failed to connect to server'))
      }
      done(null, specs)
    })
  }

  shutdown(kernel, done) {
    this.getSessions((err, sessions) => {
      if (err) return done(err)
      let sid
      sessions.some(sess => {
        if (sess.kernel.id === kernel) {
          sid = sess.id
          return true
        }
      })
      if (!sid) return done(new Error(`session for kernel ${kernel} not found`))
      del(`http://${this.config.host}/api/sessions/${sid}`, null, null, (err) => {
        if (err) console.log('failed to shut down', err)
        else console.log('Shut Down!')
        done(err)
      })
    })
  }

  restart(kernel, done) {
    post(`http://${this.config.host}/api/kernels/${kernel}/restart`, (err) => {
      if (err) console.log('failed to restart', err)
      else console.log('Restarted!!')
      done(err)
    })
  }

  interrupt(kernel, done) {
    post(`http://${this.config.host}/api/kernels/${kernel}/interrupt`, (err) => {
      if (err) console.log('failed to interrupt', err)
      else console.log('Interrupted!')
      done(err)
    })
  }

  getKernel(docid, profile, done) {
    // TODO support https
    this.getSessions((err, sessions) => {
      if (err) {
        console.log('connection error: ', error)
        return done(new Error('failed to connect'))
      }
      var matches = sessions.filter(session => {
        return session.notebook.name === docid &&
          session.kernel.name === profile
      })
      if (matches.length) {
        return done(null, matches[0].kernel.id)
      }
      this.startKernel(docid, profile, done)
    })
  }

  getSessions(done) {
    get(`http://${this.config.host}/api/sessions`, done)
  }

  startKernel(docid, profile, done) {
    const data = {
      notebook: {
        name: docid, path: docid
      },
      kernel: {
        id: null,
        name: profile,
      },
    }
    post(`http://${this.config.host}/api/sessions`, null, data, (err, session) => {
      if (err) return done(err)
      done(null, session.kernel.id)
    })
  }

  getSocket(kernel, docid, done) {
    var sock = new WebSocket(`ws://${this.config.host}/api/kernels/${kernel}/channels?session_id=${docid}`)
    let good = false
    sock.addEventListener('open', () => {
      good = true
      sock.removeEventListener('close', fail)
      sock.removeEventListener('error', fail)
      sock.send(JSON.stringify({
        header: {
          msg_id: uuid(),
          username: 'username',
          session: docid,
          msg_type: 'kernel_info_request',
          version: '5.0',
        },
        metadata: {},
        content: {},
        buffers: {},
        parent_header: {},
        channel: 'shell',
      }))
      done(null, sock)
    })

    function fail(error) {
      if (good) return
      console.log('fail', error)
      sock.removeEventListener('close', fail)
      sock.removeEventListener('error', fail)
      done(new Error('failed to get socket'))
    }

    sock.addEventListener('close', fail)
    sock.addEventListener('error', fail)
  }

}

