
module.exports = {
  keys: {
    'execute': {
      normal: 'shift+return',
      insert: 'shift+return',
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
  },

  node: require('./node'),
}


