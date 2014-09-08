/**
 * bootstrap the app into document.body
 */

var Gorilla = require('./lib/Gorilla')
var Kernel = require('./lib/kernel')
var React = require('treed/node_modules/react')
var treed = require('treed/rx')
var LocalPL = require('treed/rx/pl/local')
var convert = require('./lib/convert')
var demoData = require('./demo-data.js')

window.React = React

window.onload = function () {
  // var host = "localhost:8889"
  var host = "localhost:" + location.hash.split('/')[0].slice(1)
    , path = "test.ipynb"

  treed.quickstart(document.body, {
    storeOptions: {
      data: demoData,
      pl: new LocalPL({prefix: 'ipython'}),
    },
    React: React,
    plugins: [
      require('./lib/plugin'),
      require('treed/rx/plugins/undo'),
      require('treed/rx/plugins/rebase'),
      require('treed/rx/plugins/collapse'),
      require('treed/rx/plugins/done'),
    ],
  }, (store) => {
    window.store = store
    window.actions = store.actions
  })

}

