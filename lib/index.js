
import extend from '../lib/extend'

var React = require('react')
  , Listener = require('treed/listener')

  , KernelController = require('./components/kernel-controller')

function defaultNodeConfig(config) {
  const serv = Object.keys(config)[0]
  let kern = 'default'
  if (config[serv].kernels) {
    kern = config[serv].kernels[0]
  }
  return {
    server: serv,
    kernel: kern,
  }
}

module.exports = (config, doc) => ({
  id: 'itreed',
  title: 'Code REPL',

  types: {
    'code-playground': {
      title: 'Code Playground',
      shortcut: 'p',
    },
    ipython: {
      title: 'Code Block',
      shortcut: 'c',
      update(node) {
        return {itreed: defaultNodeConfig(config)}
      }
    }
  },

  keys: require('./keys'),

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
        return <KernelController key='itreed-controller' store={store} config={config}/>
      },
    },
  },

  view: {
    global: function (store, onConfig) {
      return <KernelController
        key="itreed-controller"
        store={store}
        onConfig={onConfig}
      />
    },
  },

  db: {
    addNewNodeAttrs: function (node, prevNode) {
      return false
      if (node.type === 'ipython') {
        node.itreed = extend({}, prevNode.itreed || defaultNodeConfig(config))
      }
    },
  },

  store: require('./store')(config, doc),

  node: require('./node'),
})

