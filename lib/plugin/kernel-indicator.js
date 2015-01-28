
var React = require('react')
  , PT = React.PropTypes

var KernelPicker = require('./kernel-picker')

var KernelIndicator = React.createClass({
  propTypes: {
    type: PT.string,
    onChange: PT.func,
    onReconnect: PT.func,
    onChooseKernel: PT.func,
    host: PT.string,
    status: PT.string,
    kernels: PT.array,
    session: PT.string,
  },

  render: function () {
    if (this.props.status === 'error') {
      return <div className='m_IPythonKernel_indicator m_IPythonKernel_indicator-error'>
        Error connecting to {this.props.host}!
        <button onClick={this.props.onReconnect}>Reconnect</button>
        <button onClick={this.props.onChange}>Change Host</button>
      </div>
    }

    if (this.props.status === 'available-kernels') {
      return <KernelPicker
        onPick={this.props.onChooseKernel}
        onCancel={this.props.onChange}
        kernels={this.props.kernels}/>
    }

    if (!this.props.host && this.props.remote) {
      return <div
          onClick={this.props.onChange}
          className='m_IPythonKernel_indicator m_IPythonKernel_indicator-disconnected'>
        Set the repl host
      </div>
    }

    return <div
        onClick={this.props.onChange}
        className={
          'm_IPythonKernel_indicator m_IPythonKernel_indicator-' + this.props.status
        }>
      {this.props.host || 'Local'}
      {this.props.status === 'running' &&
        <span
          onClick={this.props.onInterrupt}
          title='interrupt'
          className='m_IPythonKernel_indicator_interrupt'>&times;</span>}
      <span className={
        'm_IPythonKernel_indicator_icon m_IPythonKernel_indicator_icon-' + this.props.status
      }/>
      {this.props.status === 'disconnected' &&
        <button onClick={this.props.onReconnect}>Reconnect</button>}
      {this.props.status === 'disconnected' &&
        <button onClick={this.props.onChange}>Change Host</button>}
    </div>
  }
})

module.exports = KernelIndicator

