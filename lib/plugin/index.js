
var React = require('treed/node_modules/react')
  , Listener = require('treed/rx/listener')

  , Gorilla = require('../Gorilla')
  , Kernel = require('../kernel')
  , KernelController = require('./kernel-controller')

module.exports = (type, language) => ({
  keys: {
    'execute': {
      normal: 'shift+return',
      insert: 'shift+return',
    },
    'execute many': {
      visual: 'shift+return',
    },
    'execute deep': {
      normal: 'ctrl+shift+return',
      insert: 'ctrl+shift+return',
    },
    'execute many deep': {
      visual: 'ctrl+shift+return',
    },

    'type ipython': {
      normal: 't c, alt+t c',
      insert: 'alt+t c',
    },
    'type normal': {
      normal: 't n, alt+t n',
      insert: 'alt+t n',
    },
    'toggle display collapse': {
      normal: 'space',
    },
  },

  view: {
    blocks: {
      top: function (actions, state, store) {
        return KernelController({store: store, type: type})
      },
    },
  },

  db: {
    addNewNodeAttrs: function (node) {
      if (node.type === 'ipython') {
        node.language = language
      }
    },
  },

  store: {
    init: function (store) {
      var host = location.hash.slice(1).split('/')[0]
      var K = {
        gorilla: Gorilla,
        ipython: Kernel,
      }[type];

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
    actions: require('./actions')(type, language),
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
})


