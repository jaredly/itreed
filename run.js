/**
 * bootstrap the app into document.body
 */

var React = require('treed/node_modules/react')
var treed = require('treed/rx')

var files = require('./app/files')

var App = require('./app')

window.run_require = require
window.React = React

// configuration things
var format = require('./lib/plugin/format')

var formatters = [
  require('./formatters/live'),
  require('./formatters/live-button'),
  require('./formatters/react'),
  require('./formatters/vega'),
  require('./formatters/dom'),
  require('./formatters/latex'),
  // require('./formatters/image'),
  require('./formatters/list-like'),
  require('./formatters/js'),
]

formatters.map(plugin => {
  if (plugin.display) {
    format.displayer(plugin.display, plugin.mime)
  }
  if (plugin.format) {
    format.formatter(plugin.format, plugin.mime)
  }
})

window.onload = function () {
  React.renderComponent(App({}), document.body)
}

