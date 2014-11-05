
var React = require('treed/node_modules/react')
  , PT = React.PropTypes

var SaveAsModal = React.createClass({
  propTypes: {
    onClose: PT.func.isRequired,
  },
  render: function () {
    return <div className='SaveAsModal'>
      <div className='SaveAsModal_top'>
        
      </div>
    </div>
  }
})

SaveAsModal.bootstrap = function (props) {
  var node = document.createElement('div')
  document.body.appendChild(node)
  props.onClose = function () {
    node.parentNode.removeChild(node)
  }
  React.render(SaveAsModal(props), node)
}

module.exports = SaveAsModal

