
var React = require('react')
  , Listener = require('treed/listener')

  , KernelController = require('./components/kernel-controller')

module.exports = (kernelConfig, config) => ({
  title: 'Code REPL',

  types: {
    'code-playground': {
      title: 'Code Playground',
      shortcut: 'p',
    },
    ipython: {
      title: 'Code Block',
      shortcut: 'c',
      update: {language: kernelConfig.language},
    }
  },

  keys: {
    'execute': {
      type: 'ipython',
      normal: 'shift+enter',
      insert: 'shift+enter',
      visual: 'shift+enter',
    },
    'execute deep': {
      normal: 'ctrl+shift+enter',
      insert: 'ctrl+shift+enter',
      visual: 'ctrl+shift+enter',
    },
    'toggle display collapse': {
      title: '(un) collapse code output',
      normal: 'space',
    },
    'execute and add': {
      type: 'ipython',
      title: 'execute and add a node after',
      normal: 'alt+enter',
      insert: 'alt+enter',
    },
    'toggle editor collapse': {
      title: '(un) collapse code editor',
      normal: 'shift+space',
    },
  },

  contextMenu: function (node, state) {
    if (!node || node.type !== 'ipython') return
    return [{
      title: 'Run Block',
      action: 'execute',
    }, {
      title: 'Toggle Output',
      action: 'toggleDisplayCollapse',
    }, {
      title: 'Toggle Code',
      action: 'toggleEditorCollapse',
    }]
  },

  app: {
    blocks: {
      icon: function (actions, state, store) {
      },

      bar: function (actions, state, store) {
        return <KernelController store={store} type={kernelConfig.type}/>
      },
    },
  },

  view: {
    global: function (store) {
      return <KernelController
        key="itreed-controller"
        store={store}
        type={kernelConfig.type}
        remote={kernelConfig.remote}
      />
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
      var K = kernelConfig.kernel;

      var kernel = store._globals.kernel = new K(store.db.root, null, kernelConfig.language)
      var host = config && config.hosts && config.hosts[kernel.type]
      store._globals.kernelError = false
      kernel.on('session', () => {
        store.changed(store.events.kernelSession())
      })
      kernel.on('status', () => {
        store.changed(store.events.kernelStatus())
      })
      if (host || !kernelConfig.remote) {
        if (host && host.indexOf(':') === -1) {
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

