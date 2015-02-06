
var React = require('react')
  , Listener = require('treed/listener')

  , KernelController = require('./kernel-controller')

module.exports = (kernelConfig) => ({
  types: {
    'code-playground': {
      shortcut: 'p',
    },
    ipython: {
      shortcut: 'c',
      update: {language: kernelConfig.language},
    }
  },

  keys: {
    'execute': {
      type: 'ipython',
      normal: 'shift+enter',
      insert: 'shift+enter',
    },
    'execute many': {
      type: 'ipython',
      visual: 'shift+enter',
    },
    'execute deep': {
      normal: 'ctrl+shift+enter',
      insert: 'ctrl+shift+enter',
    },
    'execute many deep': {
      visual: 'ctrl+shift+enter',
    },
    'toggle editor collapse': {
      type: 'code-playground',
      normal: 'space',
    },
    'toggle display collapse': {
      type: 'ipython',
      normal: 'space',
    },
    'execute and add': {
      type: 'ipython',
      normal: 'alt+enter',
      insert: 'alt+enter',
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

