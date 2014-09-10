/**
 * bootstrap the app into document.body
 */

var React = require('treed/node_modules/react')
var treed = require('treed/rx')
var LocalPL = require('treed/rx/pl/local')

var convert = require('./lib/convert')
var App = require('./app')

window.React = React

window.onload = function () {
  var plugins = [
    require('./lib/plugin')(window.kernelType, window.kernelLanguage), // itreed

    require('treed/rx/plugins/undo'),
    require('treed/rx/plugins/collapse'),

    // require('treed/rx/plugins/rebase'),
    // require('treed/rx/plugins/done'),
  ]
  var storeOptions = {
    data: window.demoData,
    pl: new LocalPL({prefix: window.kernelType}),
  }
  treed.initStore(plugins, storeOptions, (store) => {
    var storeView = store.registerView()

    treed.initView(null, store, plugins, null, (viewStore, viewProps) => {
      window.store = store
      window.actions = viewStore.actions

      React.renderComponent(App({
        store: store,
        View: require('treed/rx/views/tree'),
        viewProps: viewProps,
      }), document.body)
    })
  })
}

