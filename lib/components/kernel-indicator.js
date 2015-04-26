
import classnames from 'classnames'
import Listener from 'treed/listener'

var React = require('react')
  , PT = React.PropTypes

export default React.createClass({
  mixins: [Listener({
    storeAttrs(getters, props) {
      const server = props.kernel.serverId
      const kernel = props.kernel.id
      return {
        kernelHost: getters.kernelHost(server, kernel),
        kernelStatus: getters.kernelStatus(server, kernel),
        kernelSession: getters.kernelSession(server, kernel),
        kernelError: getters.kernelError(server, kernel),
      }
    },
    getListeners(props, events) {
      const server = props.kernel.serverId
      const kernel = props.kernel.id
      return [events.kernelStatus(server, kernel),
              events.kernelSession(server, kernel),
              events.kernelError(server, kernel)]
    }
  })],

  render() {
    return <div className={'KernelIndicator KernelIndicator-' + this.props.kernel.status}>
      <span className='KernelIndicator_icon'/>
      <span className='KernelIndicator_title'>
        {this.props.kernel.title || "Unknown kernel"}
      </span>
    </div>
  }
})

// var KernelPicker = require('./kernel-picker')

/*
var KernelIndicator = React.createClass({
  propTypes: {
    type: PT.string,
    onChange: PT.func,
    onReconnect: PT.func,
    onChooseKernel: PT.func,
    host: PT.string,
    status: PT.string,
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

    if (!this.props.host && this.props.remote) {
      return <div
          onClick={this.props.onChange}
          className='m_IPythonKernel_indicator m_IPythonKernel_indicator-disconnected'>
        Set the repl host
      </div>
    }

    return <div
        onClick={this.props.host && this.props.onChange}
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
*/

