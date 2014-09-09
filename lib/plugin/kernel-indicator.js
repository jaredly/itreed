
var React = require('treed/node_modules/react')
  , PT = React.PropTypes

var KernelIndicator = React.createClass({
  propTypes: {
    type: PT.string,
    onReconnect: PT.func,
    host: PT.string,
    status: PT.string,
    session: PT.string,
  },
  render: function () {
    if (this.props.status === 'error') {
      return <div className='m_IPythonKernel_indicator m_IPythonKernel_indicator-error'>
        Error connecting to {this.props.host}!<br/>
        <button onClick={this.props.onReconnect}>Reconnect</button>
        <button onClick={this.props.onChange}>Change Host</button>
      </div>
    }
    if (!this.props.host) {
      return <div
          onClick={this.props.onChange}
          className='m_IPythonKernel_indicator m_IPythonKernel_indicator-disconnected'>
        Click here to set the {this.props.type === 'ipython' ? 'iPython' : 'Gorilla-repl'} host
      </div>
    }
    return <div
        onClick={this.props.onChange}
        className={
          'm_IPythonKernel_indicator m_IPythonKernel_indicator-' + this.props.status
        }>
      {this.props.host}<br/>
      <strong>{this.props.status === 'done' ? 'ready' : this.props.status}</strong>
      {this.props.status === 'disconnected' && <br/>}
      {this.props.status === 'disconnected' &&
        <button onClick={this.props.onReconnect}>Reconnect</button>}
      {this.props.status === 'disconnected' &&
        <button onClick={this.props.onChange}>Change Host</button>}
    </div>
  }
})

module.exports = KernelIndicator
