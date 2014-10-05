/**
 * bootstrap the app into document.body
 */

var React = require('treed/node_modules/react')
var treed = require('treed/rx')

var files = require('./app/files')

var App = require('./app')

window.run_require = require
window.React = React

window.onload = function () {
  React.renderComponent(App({}), document.body)
}

