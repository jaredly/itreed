
var React = require('treed/node_modules/react')
  , Listener = require('treed/rx/listener')

  , Gorilla = require('../Gorilla')
  , Kernel = require('../kernel')
  , KernelController = require('./kernel-controller')

module.exports = {
  keys: {
    'execute': {
      normal: 'shift+return',
      insert: 'shift+return',
      // TODO: visual: 'shift+return',
    },
    'execute deep': {
      normal: 'ctrl+shift+return',
      insert: 'ctrl+shift+return',
      // TODO: visual: 'shift+return',
    },
    'type ipython': {
      normal: 'ctrl+i',
      insert: 'ctrl+i',
    },
    'type normal': {
      normal: 'ctrl+m',
      insert: 'ctrl+m',
    },
    'toggle display collapse': {
      normal: 'space',
    },
  },

  view: {
    blocks: {
      top: function (actions, state, store) {
        return KernelController({store: store, type: window.kernelType})
      },
    },
  },

  db: {
    addNewNodeAttrs: function (node) {
      if (node.type === 'ipython') {
        node.language = window.kernelType === 'ipython' ? 'python' : 'clojure'
      }
    },
  },

  store: {
    init: function (store) {
      var host = location.hash.slice(1).split('/')[0]
      var K = {
        gorilla: Gorilla,
        ipython: Kernel,
      }[window.kernelType];

      var kernel = store._globals.kernel = new K()
      kernel.on('session', () => {
        store.changed(store.events.kernelSession())
      })
      kernel.on('status', () => {
        store.changed(store.events.kernelStatus())
      })
      if (host) {
        if (host.indexOf(':') === -1) {
          host = 'localhost:' + host
        }
        setTimeout(() => {
          kernel.init(host, () => {
          })
        }, 0);
      }
    },
    actions: require('./actions'),
    getters: {
      kernelStatus: function () {
        return this.globals.kernel && this.globals.kernel.status
      },

      kernelHost: function () {
        return this.globals.kernel && this.globals.kernel.host
      },

      kernelSession: function () {
        return this.globals.kernel && this.globals.kernel.session
      },
    },
    events: {
      kernelSession: () => 'kernel-session',
      kernelStatus: () => 'kernel-status',
      // kernelHost: () => 'kernel-host',
    }
  },

  node: require('./node'),
}


