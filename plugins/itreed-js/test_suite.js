
import pluginTests from '../lib/tests'
import expect from 'expect.js'

import Server from './server'
import Kernel from './kernel'

global.vm = require('vm')

pluginTests({
  Server,
  Kernel,
  serverConfig: {},
  kernelConfig: {},
  testSpec(spec) {
  },
  /*
  completes: [{
    code: 'win',
    pos: {line: 0, ch: 3},
    res: {
      list: ['window'],
      from: {line: 0, ch: 0},
      to: {line: 0, ch: 3},
    }
  }]
  */
  evals: [{
    code: '2+2',
    outputs: [{
      suppressable: false,
      'text/plain': '4',
      type: 'output',
    }]
  }]
})

