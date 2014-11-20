
var Gorilla = require('../lib/kernels/gorilla')
  , IPython = require('../lib/kernels/ipython')
  , IJS = require('../lib/kernels/js')
  , Rust = require('../lib/kernels/rust')

module.exports = {
  null: {
    title: 'None',
  },
  'ipython': {
    type: 'ipython',
    language: 'python',
    remote: true,
    title: 'Python',
    kernel: IPython,
  },
  'gorilla': {
    type: 'gorilla',
    language: 'clojure',
    remote: true,
    title: 'Clojure',
    kernel: Gorilla,
  },
  'ijulia': {
    type: 'ipython',
    language: 'julia',
    remote: true,
    title: 'Julia',
    kernel: IPython,
  },
  'ijs': {
    type: 'ijs',
    language: 'javascript',
    remote: false,
    title: 'Javascript',
    kernel: IJS,
  },
  'rust-play': {
    type: 'rust-play',
    language: 'rust',
    remote: true,
    title: 'Rust (play)',
    kernel: Rust,
  }
}

