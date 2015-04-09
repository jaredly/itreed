
import expect from 'expect.js'

import Kernel from './kernel'
import Server from './server'

const DOCID = 'test-itreed-jupyter'
const HOST = 'localhost:8888'

global.XMLHttpRequest = require('xhr2')
const ws = global.WebSocket = require('ws')
ws.prototype.removeEventListener = ws.prototype.removeListener

describe('Server', () => {
  it('should get the kernel specs', done => {
    const s = new Server({host: HOST})
    s.init((err, spec) => {
      expect(err).to.not.be.ok()
      expect(spec.default).to.be.a('string')
      expect(spec.kernelspecs).to.be.an('object')
      done()
    })
  })

  it('should get a list of sessions', done => {
    const s = new Server({host: HOST})
    s.getSessions((err, sessions) => {
      expect(err).to.not.be.ok()
      expect(sessions).to.be.an(Array)
      done()
    })
  })
})

describe('Kernel', () => {
  it('should get up and running, and then shut down', done => {
    const s = new Server({host: HOST})
    s.init((err, spec) => {
      expect(err).to.not.be.ok()
      expect(spec.default).to.be.a('string')
      expect(spec.kernelspecs).to.be.an('object')
      const k = new Kernel(s, {profile: spec.default}, DOCID)
      k.init(err => {
        expect(err).to.not.be.ok()
        k.shutdown(err => {
          expect(err).to.not.be.ok()
          done()
        })
      })
    })
  })

  describe('with a running kernel', () => {
    let k, s
    let DOCID = 'other-test'
    before(done => {
      s = new Server({host: HOST})
      s.init((err, spec) => {
        expect(err).to.not.be.ok()
        expect(spec.default).to.be.a('string')
        expect(spec.kernelspecs).to.be.an('object')
        k = new Kernel(s, {profile: spec.default}, DOCID)
        k.init(err => {
          expect(err).to.not.be.ok()
          done()
        })
      })
    })

    after(done => {
      k.shutdown(done)
    })

    it('should work with completion', done => {
      k.complete('sy man', {line: 0, ch: 2}, data => {
        expect(data).to.eql({
          list: ['%system', '%%system'],
          from: {line: 0, ch: 0},
          to: {line: 0, ch: 2},
        })
        done()
      })
    })

    it('should eval some code', done => {
      const evts = []
      k.sendShell('2+2', null, {
        start() {
          evts.push('start')
        },
        output(data) {
          evts.push(data)
        },
        end() {
          expect(evts).to.eql(['start', {
            metadata: {},
            suppressable: undefined,
            "text/plain": "4",
            type: 'display',
          }])
          done()
        },
      })
    })

    it('should eval more code', done => {
      const evts = []
      k.sendShell('print "hi"\n3', null, {
        start() {
          evts.push('start')
        },
        output(data) {
          evts.push(data)
        },
        end() {
          expect(evts).to.eql([
            'start',
            {
              text: 'hi\n',
              stream: 'stdout',
              type: 'stream',
            }, {
              metadata: {},
              suppressable: undefined,
              "text/plain": "3",
              type: 'display',
            }
          ])
          done()
        },
      })
    })

    it('should get special help', done => {
      const evts = []
      const help =  '\u001b[1;31mType:        \u001b[0mtype\n\u001b[1;31mString form: \u001b[0m<type \'list\'>\n\u001b[1;31mNamespace:   \u001b[0mPython builtin\n\u001b[1;31mDocstring:\u001b[0m\nlist() -> new empty list\nlist(iterable) -> new list initialized from iterable\'s items'
      k.sendShell('list?', null, {
        start() {
          evts.push('start')
        },
        output(data) {
          evts.push(data)
        },
        end() {
          expect(evts).to.eql([
            'start',
            {
              suppressable: undefined,
              "text/plain": help,
              'text/ansi': help,
              type: 'output',
            }
          ])
          done()
        },
      })
    })

  })
})

