
var React = require('treed/node_modules/react')
  , Listener = require('treed/rx/listener')

  , KernelController = require('./kernel-controller')

module.exports = (kernelConfig) => ({
  types: {
    ipython: {
      shortcut: 'c',
      update: {language: kernelConfig.language},
    }
  },

  keys: {
    'execute': {
      type: 'ipython',
      normal: 'shift+return',
      insert: 'shift+return',
    },
    'execute many': {
      type: 'ipython',
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
      type: 'ipython',
      normal: 'space',
    },
    'execute and add': {
      type: 'ipython',
      normal: 'alt+return',
      insert: 'alt+return',
    },
  },

  app: {
    blocks: {
      icon: function (actions, state, store) {
      },

      bar: function (actions, state, store) {
        return KernelController({store: store, type: kernelConfig.type})
      },
    },
  },

  view: {
    global: function (store) {
      return KernelController({store: store, type: kernelConfig.type, remote: kernelConfig.remote})
    },
  },

  db: {
    addNewNodeAttrs: function (node) {
      if (node.type === 'ipython') {
        node.language = kernelConfig.language
      }
    },
  },

  store: {
    init: function (store) {
      var host = location.hash.slice(1).split('/')[0]
      var K = kernelConfig.kernel;

      var kernel = store._globals.kernel = new K(store.db.root)
      store._globals.kernelError = false
      kernel.on('session', () => {
        store.changed(store.events.kernelSession())
      })
      kernel.on('status', () => {
        store.changed(store.events.kernelStatus())
      })
      if (host || !kernelConfig.remote) {
        if (host.indexOf(':') === -1) {
          host = 'localhost:' + host
        }
        setTimeout(() => {
          kernel.init(host, () => {
          })
        }, 0);
      }
    },

    teardown: function (store) {
      store._globals.kernel.teardown && store._globals.kernel.teardown()
    },

    actions: require('./actions')(kernelConfig.type, kernelConfig.language),
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
      kernelsAvailable: function () {
        return this.globals.kernel && this.globals.kernel.available_kernels
      },
    },

    events: {
      kernelSession: () => 'kernel-session',
      kernelStatus: () => 'kernel-status',
      kernelError: () => 'kernel-error',
    }
  },

  node: require('./node'),
})

