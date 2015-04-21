
import extend from '../lib/extend'

var React = require('react')
  , Listener = require('treed/listener')

  , KernelController = require('./components/kernel-controller')

function kernelChangerMenu(node, store) {
  if (!store.globals.itreed || store.globals.itreed.numKernels < 2) return null
  const options = []
  const kernels = store.globals.itreed.kernels
  function setKernel(config) {
    store.set(node.id, 'itreed', config)
  }
  for (let key in kernels) {
    const kernel = kernels[key]
    if (kernel.variants.default) {
      options.push({
        title: kernel.title,
        action: setKernel.bind(null, {
          server: kernel.serverId,
          kernel: kernel.id,
          variant: null,
        })
      })
    }
    for (let v in kernel.variants) {
      if (!kernel.variants[v] || v === 'default') continue
      options.push({
        title: kernel.title + ' (' + (kernel.variants[v].title || v) + ')',
        action: setKernel.bind(null, {
          server: kernel.serverId,
          kernel: kernel.id,
          variant: v,
        })
      })
    }
  }

  return {
    title: 'Set Kernel',
    children: options
  }
}

function defaultNodeConfig(config) {
  const serv = Object.keys(config)[0]
  let kern = 'default'
  let variant = 'default'
  if (config[serv].kernels) {
    kern = Object.keys(config[serv].kernels)[0]
  }
  if (config[serv].kernels[kern].variants) {
    variant = Object.keys(config[serv].kernels[kern].variants)[0]
  }
  return {
    server: serv,
    kernel: kern,
    variant,
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

  contextMenu: function (node, store) {
    if (!node || node.type !== 'ipython') return
    return [kernelChangerMenu(node, store), {
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
      if (node.type === 'ipython') {
        node.itreed = extend({}, (prevNode && prevNode.itreed) || defaultNodeConfig(config))
      }
    },
  },

  store: require('./store')(config, doc),

  node: require('./node'),
})

