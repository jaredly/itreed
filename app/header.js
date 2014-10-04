
var React = require('treed/node_modules/react')
  , PT = React.PropTypes
  , Dupload = require('./dupload')

var Header = React.createClass({
  propTypes: {
    file: PT.object.isRequired,
    store: PT.object.isRequired,
    onClose: PT.func.isRequired,
  },

  render: function () {
    return <div className='Header'>
      <button className='Header_close' onClick={this.props.onClose}>
        Close
      </button>
      <span className='Header_filename'>
        {this.props.file.title}
      </span>
      <span className='Header_name'>Notablemind:repl</span>
      <Dupload store={this.props.store}/>
    </div>
  }
})

module.exports = Header
