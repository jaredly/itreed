/**
 * bootstrap the app into document.body
 */

var Gorilla = require('./lib/Gorilla')
var Kernel = require('./lib/kernel')
var React = require('treed/node_modules/react')
var treed = require('treed/rx')
var LocalPL = require('treed/rx/pl/local')
var convert = require('./lib/convert')

window.React = React

window.onload = function () {
  treed.quickstart(document.body, {
    storeOptions: {
      data: window.demoData,
      pl: new LocalPL({prefix: window.kernelType}),
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

