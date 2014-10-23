
var parseGorilla = require('./gorilla')
var ipython = require('./ipython')
var python = require('./python')

module.exports = {
  nm: {
    ext: 'nm',
    mime: 'application/json',
    strFromTrees: function (trees) {
      return JSON.stringify(trees, null, 2)
    },
    treeFromStr: function (str) {
      try {
        var trees = JSON.parse(str)
      } catch (e) {
        return new Error("Unable to parse file. Are you sure it's the right format?")
      }
      if (!Array.isArray(trees) || !trees.length || !trees[0].content || !trees[0].children) {
        return new Error("This doesn't look like the right format.")
      }
      return trees
    },
  },
  ipython: {
    ext: 'ipynb',
    mime: 'application/json',
    strFromTrees: ipython.toStr,
    treeFromStr: ipython.fromStr,
  },
  python: {
    ext: 'py',
    mime: 'text/python',
    strFromTrees: python.toStr,
    treeFromStr: python.fromStr,
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
    ['python', 'Python (.py)'],
    // ['md', 'Markdown (.md)'],
    // latex: 'Latex (.tx)',
  ],
  exts: {
    'nm': 'nm',
    'py': 'python',
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

