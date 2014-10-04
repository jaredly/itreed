
var React = require('treed/node_modules/react')
  , PT = React.PropTypes
  , Dupload = require('./dupload')

var Header = React.createClass({
  propTypes: {
    store: PT.object,
  },

  render: function () {
    return <div className='Header'>
      <span className='Header_name'>Notablemind:repl</span>
      <Dupload store={this.props.store}/>
    </div>
  }
})

module.exports = Header
