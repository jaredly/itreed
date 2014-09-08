
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

  store: {
    actions: require('./actions'),
    getters: {
      kernelSession: function () { return this.globals.kernel.session },
    }
  },

  node: require('./node'),
}


