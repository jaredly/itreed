
module.exports = {
  keys: {
    'execute': {
      normal: 'shift+return',
      insert: 'shift+return',
      // TODO: visual: 'shift+return',
    },
    'type ipython': {
      normal: 'ctrl+i',
    },
    'type normal': {
      normal: 'ctrl+m',
    },
  },

  store: {
    actions: require('./actions'),
  },

  node: require('./node'),
}


