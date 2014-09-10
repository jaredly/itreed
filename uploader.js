
var React = require('treed/node_modules/react')
  , PT = React.PropTypes
  , Modal = require('./modal')

var Uploader = React.createClass({
  render: function () {
    return <Modal onClose={this.props.onClose} title="Upload">
      This is where you upload things.
    </Modal>
  }
})

module.exports = Uploader


