
module.exports = {
  nm: {
    ext: 'nm',
    mime: 'application/json',
    strFromTree: function (tree) {
      return JSON.stringify(tree, null, 2)
    },
  },
  ipython: {
    ext: 'pynb',
    mime: 'application/json',
    strFromTree: function (tree) {
      return 'iPython WIP'
    },
  },
  gorilla: {
    ext: 'clj',
    mime: 'text/clojure',
    strFromTree: function (tree) {
      return 'Clojure WIP'
    },
  },
  formats: [
    ['nm', 'Notablemind (.nm)'],
    ['ipython', 'IPython (.pynb)'],
    ['gorilla', 'Gorilla (.clj)'],
    // ['md', 'Markdown (.md)'],
    // latex: 'Latex (.tx)',
  ],
  exts: {
    'nm': 'nm',
    'pynb': 'ipython',
    'clj': 'gorilla',
  },
  detect: function (filename) {
    var parts = filename.split('.')
      , ext = parts[parts.length - 1]
      , fromExt = module.exports.exts[ext]
    if (fromExt) return fromExt
    // TODO: content based
  },
}

