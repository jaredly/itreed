
import expect from 'expect.js'
import pluginTests from '../lib/tests'

import Kernel from './kernel'
import Server from './server'

const DOCID = 'test-itreed-jupyter'
const HOST = 'localhost:8888'

global.XMLHttpRequest = require('xhr2')
const ws = global.WebSocket = require('ws')
ws.prototype.removeEventListener = ws.prototype.removeListener

const help =  '\u001b[1;31mType:        \u001b[0mtype\n' +
  '\u001b[1;31mString form: \u001b[0m<type \'list\'>\n' +
  '\u001b[1;31mNamespace:   \u001b[0mPython builtin\n' +
  '\u001b[1;31mDocstring:\u001b[0m\n' +
  'list() -> new empty list\n' +
  'list(iterable) -> new list initialized from iterable\'s items'

pluginTests({
  Server,
  Kernel,
  serverConfig: {host: HOST},
  kernelConfig: {profile: 'python2'},
  testSpec(spec) {
    expect(spec.default).to.be.a('string')
    expect(spec.kernelspecs).to.be.an('object')
  },
  completes: [{
    code: 'sy man',
    pos: {line: 0, ch: 2},
    res: {
      list: ['%system', '%%system'],
      from: {line: 0, ch: 0},
      to: {line: 0, ch: 2},
    }
  }],
  evals: [{
    code: '2+2',
    outputs: [{
      metadata: {},
      suppressable: undefined,
      "text/plain": "4",
      type: 'display',
    }]
  }, {
    code: 'print "hi"\n3',
    outputs: [{
      text: 'hi\n',
      stream: 'stdout',
      type: 'stream',
    }, {
      metadata: {},
      suppressable: undefined,
      "text/plain": "3",
      type: 'display',
    }],
  }, {
    code: 'list?',
    outputs: [{
      suppressable: undefined,
      "text/plain": help,
      'text/ansi': help,
      type: 'output',
    }]
  }]
})

describe('More Server tests', () => {

  it('should get a list of sessions', done => {
    const s = new Server({host: HOST})
    s.getSessions((err, sessions) => {
      expect(err).to.not.be.ok()
      expect(sessions).to.be.an(Array)
      done()
    })
  })

})
