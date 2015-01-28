
var React = require('react')
  , uuid = require('../lib/uuid')

  , _objs = {}

module.exports = {
  mime: 'js/dom',

  format: function (obj, window) {
    if (obj instanceof window.HTMLElement) {
      var id = uuid()
      _objs[id] = obj
      return id
    }
  },

  display: function (id) {
    if (!_objs[id]) return <em>Re-evaluate this block to see the DOM element</em>
    return <DomViewer value={_objs[id]}/>
  },
}

function clean(node) {
  while (node.lastChild) node.removeChild(node.lastChild)
}

var DomViewer = React.createClass({
  componentDidMount: function () {
    this.inject()
  },
  componentDidUpdate: function (prevProps) {
    this.inject()
  },
  inject: function () {
    var node = this.getDOMNode()
    clean(node)
    //if (this.props.value.parentNode) {
      //node.innerHTML = '<em>DOM Node already used elsewhere</em>'
    //} else {
      node.appendChild(this.props.value)
    //}
  },
  render: function () {
    return <div/>
  },
})
