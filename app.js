
var React = require('treed/node_modules/react')
  , PT = React.PropTypes
  , Header = require('./header')

var App = React.createClass({
  propTypes: {
    store: PT.object,
    viewProps: PT.object,
    viewProps2: PT.object,
    View: PT.func,
  },
  render: function () {
    return <div className={'app' + (this.props.viewProps2 ? ' app-dual' : '')}>
      <Header store={this.props.store}/>
      {this.props.viewProps2 ?
        <div className="app_dual">
          <div className="app_left">
            {this.props.View(this.props.viewProps)}
          </div>
          <div className="app_right">
            {this.props.View(this.props.viewProps2)}
          </div>
        </div> :
        this.props.View(this.props.viewProps)}
    </div>
  },
})

module.exports = App

