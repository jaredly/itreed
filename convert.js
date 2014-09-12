
var parseGorilla = require('./parse-gorilla')
var ipython = require('./parse-ipython')

module.exports = {
  nm: {
    ext: 'nm',
    mime: 'application/json',
    strFromTrees: function (trees) {
      return JSON.stringify(trees, null, 2)
    },
    treeFromStr: function (str) {
      try {
        var tree = JSON.parse(str)
      } catch (e) {
        return new Error("Unable to parse file. Are you sure it's the right format?")
      }
      if (!tree.content || !tree.children) {
        return new Error("This doesn't look like the right format.")
      }
      return tree
    },
  },
  ipython: {
    ext: 'ipynb',
    mime: 'application/json',
    strFromTrees: ipython.toStr,
    treeFromStr: ipython.fromStr,
  },
  gorilla: {
    ext: 'clj',
    mime: 'text/clojure',
    strFromTrees: parseGorilla.toStr,
    treeFromStr: parseGorilla.fromStr,
  },
  formats: [
    ['nm', 'Notablemind (.nm)'],
    ['ipython', 'IPython (.ipynb)'],
    ['gorilla', 'Gorilla (.clj)'],
    // ['md', 'Markdown (.md)'],
    // latex: 'Latex (.tx)',
  ],
  exts: {
    'nm': 'nm',
    'ipynb': 'ipython',
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

