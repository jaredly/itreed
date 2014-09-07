/**
 * bootstrap the app into document.body
 */

var Kernel = require('./lib/kernel')
var React = require('treed/node_modules/react')
var treed = require('treed/rx')
var convert = require('./lib/convert')

window.React = React

window.onload = function () {
  var host = "localhost:8889"
    , path = "test.ipynb"
    , kernel = new Kernel(host, path)

  kernel.init((notebook_data) => {
    var data = convert.fromNotebook(notebook_data.content.worksheets[0].cells)
    treed.quickstart(document.body, {
      storeOptions: {data: data},
      React: React,
      plugins: [
        require('./lib/treed-plugin'),
        require('treed/rx/plugins/undo'),
        require('treed/rx/plugins/rebase'),
        require('treed/rx/plugins/collapse'),
        require('treed/rx/plugins/done'),
      ],
    }, (store) => {
      store._globals.kernel = kernel
      window.store = store
      window.actions = store.actions
    })
  })

}

