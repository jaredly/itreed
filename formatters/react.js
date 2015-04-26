
var React = require('react')
  , uuid = require('../lib/uuid')
  , _cache = {}

module.exports = {
  mime: 'js/react',

  display: function (value, meta) {
    if (_cache[value]) {
      return <Sandbox comp={_cache[value]}/>
    }
    return <em>Evaluate to see React Component</em>;
  },

  format: function (value) {
    if (React.isValidElement(value)) {
      var id = uuid()
      _cache[id] = value
      return id
    }
  },
}

var Sandbox = React.createClass({
  getInitialState: function () {
    return {error: null}
  },
  componentDidMount: function () {
    this._renderSandbox()
  },
  componentDidUpdate: function (prevProps) {
    if (prevProps.comp === this.props.comp) return
    this._renderSandbox()
  },
  _renderSandbox: function () {
    try {
      React.render(this.props.comp, this.refs.sandbox.getDOMNode())
    } catch (e) {
      return this.setState({error: 'Failed to render component: ' + e.message + '\n' + e.stack})
    }
    this.setState({error: null})
  },
  render: function () {
    return <div className='sandbox'>
      <div ref="sandbox"/>
      {this.state.error && <div className='sandbox_error'>{this.state.error}</div>}
    </div>
  }
})

