
var React = require('treed/node_modules/react')
  , PT = React.PropTypes
  , Header = require('./header')

var App = React.createClass({
  propTypes: {
    store: PT.object,
    viewProps: PT.object,
    View: PT.func,
  },
  render: function () {
    return <div className='app'>
      <Header store={this.props.store}/>
      {this.props.View(this.props.viewProps)}
    </div>
  },
})

module.exports = App

