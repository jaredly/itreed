/**
 * bootstrap the app into document.body
 */

var App = require('./lib/app')
var Kernel = require('./lib/kernel')
var React = require('react/addons')
var treed = require('../treed/rx')
var convert = require('./lib/convert')

window.React = React

window.onload = function () {
  var host = "localhost:8889"
    , path = "test.ipynb"
    , kernel = new Kernel(host, path)
    
  kernel.init((notebook_data) => {
    /*(
    React.renderComponent(App({
      kernel: kernel,
    }), document.body)
    */
    var data = convert.fromNotebook(notebook_data.content.worksheets[0].cells)
    treed.quickstart(document.body, {
      storeOptions: {data: data},
    }, (store) => {
      window.store = store
      window.actions = store.actions
    })
  })


}

