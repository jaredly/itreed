
var Gorilla = require('../lib/Gorilla')
  , IPython = require('../lib/kernel')
  , IJS = require('../lib/kernels/js')

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
}

