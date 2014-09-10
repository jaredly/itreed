
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
}

