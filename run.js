/**
 * bootstrap the app into document.body
 */

var App = require('./lib/app')
var React = require('react/addons')

window.React = React

window.onload = function () {
  React.renderComponent(App({
  }), document.body)
}

