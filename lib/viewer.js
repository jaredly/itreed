
var React = require('react')
  , PT = React.PropTypes

var Viewer = React.createClass({
  propTypes: {
    host: PT.string.isRequired,
    path: PT.string.isRequired,
  },
  render: function () {
    return <div className='Viewer'>
      <strong>Host:</strong> {this.props.host} <strong>Path:</strong> {this.props.path}
    </div>
  }
})

module.exports = Viewer

