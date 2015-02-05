
var React = require('react')

var LiveButton = React.createClass({
  _onClick: function (e) {
    e.preventDefault()
    this.props.store.globals.kernel.sendLive(this.props.live_id, true)
  },
  render: function () {
    return <button onClick={this._onClick}>{this.props.label}</button>
  },
})

module.exports = {
  mime: 'live/button',

  display: function (value, store, meta) {
    return LiveButton({label: value.label, store: store, live_id: meta && meta.live_id})
  },
}

