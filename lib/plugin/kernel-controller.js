
var React = require('treed/node_modules/react')
  , Listener = require('treed/rx/listener')
  , KernelIndicator = require('./kernel-indicator')
  , KernelChanger = require('./kernel-changer')

var KernelController = React.createClass({
  mixins: [Listener({
    storeAttrs: function (getters, props) {
      return {
        kernelHost: getters.kernelHost(),
        kernelStatus: getters.kernelStatus(),
        kernelSession: getters.kernelSession(),
        kernelError: getters.kernelError(),
        kernelsAvailable: getters.kernelsAvailable(),
      }
    },

    getListeners: function (props, events) {
      return [events.kernelStatus(),
              events.kernelSession(),
              events.kernelError()]
    },
  })],

  getInitialState: function () {
    return {
      changing: false
    }
  },

  componentDidUpdate: function (prevProps, prevState) {
    if (!prevState.kernelError && this.state.kernelError) {
      if (this._tout) {
        clearTimeout(this._tout)
      }
      this._tout = setTimeout(() => {
        this.props.store.actions.clearKernelError()
        this._tout = null
      }, 2000)
    }
  },

  _onConnect: function (host) {
    this.setState({changing: false})
    var k = this.props.store.globals.kernel
    window.location.hash = host
    k.disconnect()
    k.init(host, (err) => {
      // do something on error?
    })
  },

  _onReconnect: function (e) {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    this._onConnect(this.state.kernelHost)
  },

  _onChange: function (e) {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    this.setState({changing: true})
  },

  _onCancel: function (e) {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    this.setState({changing: false})
  },

  _onChooseKernel: function (kernel) {
    var k = this.props.store.globals.kernel
    k.useKernel(kernel)
  },

  render: function () {
    return <div className={'m_IPythonKernel m_IPythonKernel-' + this.state.kernelStatus}>
      {this.state.kernelError &&
        <div className='m_IPythonKernel_error'>{this.state.kernelError}</div>}
      {this.state.changing ?
        <KernelChanger
          initialValue={this.state.kernelHost}
          type={this.props.type}
          onCancel={this._onCancel}
          onDone={this._onConnect}/> :
        <KernelIndicator
          onReconnect={this._onReconnect}
          onChange={this._onChange}
          type={this.props.type}
          host={this.state.kernelHost}
          status={this.state.kernelStatus}
          kernels={this.state.kernelsAvailable}
          onChooseKernel={this._onChooseKernel}
          session={this.state.kernelSession}/>
      }
    </div>
  },
})

module.exports = KernelController

