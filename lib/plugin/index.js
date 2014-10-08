
var React = require('treed/node_modules/react')
  , Listener = require('treed/rx/listener')

  , Gorilla = require('../Gorilla')
  , Kernel = require('../kernel')
  , KernelController = require('./kernel-controller')

module.exports = (type, language) => ({
  types: {
    ipython: {
      shortcut: 'c',
      update: {language: language},
    }
  },

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
    'toggle display collapse': {
      normal: 'space',
    },
  },

  app: {
    blocks: {
      icon: function (actions, state, store) {
      },

      bar: function (actions, state, store) {
        return KernelController({store: store, type: type})
      },
    },
  },

  view: {
    statusbar: function (store) {
      return KernelController({store: store, type: type})
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
      store._globals.kernelError = false
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
      kernelError: function () {
        return this.globals.kernelError
      },
    },

    events: {
      kernelSession: () => 'kernel-session',
      kernelStatus: () => 'kernel-status',
      kernelError: () => 'kernel-error',
      // kernelHost: () => 'kernel-host',
    }
  },

  node: require('./node'),
})

