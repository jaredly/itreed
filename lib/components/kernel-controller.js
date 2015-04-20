
var React = require('react')
  , Listener = require('treed/listener')
  , KernelIndicator = require('./kernel-indicator')
  , KernelChanger = require('./kernel-changer')

const {PropTypes: PT} = React

export default React.createClass({
  propTypes: {
    store: PT.object.isRequired,
    onConfig: PT.func,
  },

  mixins: [Listener({
    storeAttrs(getters, props) {
      return {kernels: getters.kernels()}
    },
    getListeners(props, events) {
      return [events.kernels()]
    }
  })],

  render() {
    if (!this.state.kernels) return <div className='KernelController'>Loading...</div>
    return <ul onClick={this.props.onConfig} className='KernelController'>
      {Object.keys(this.state.kernels).map(id => <li className='KernelController_item'>
        <KernelIndicator store={this.props.store} kernel={this.state.kernels[id]}/>
      </li>)}
    </ul>
  }
})

/*
var KernelController = React.createClass({
  propTypes: {
    remote: React.PropTypes.bool,
  },

  mixins: [Listener({
    storeAttrs: function (getters, props) {
      return {
        kernelHost: getters.kernelHost(),
        kernelStatus: getters.kernelStatus(),
        kernelSession: getters.kernelSession(),
        kernelError: getters.kernelError(),
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

  contextTypes: {
    updatePlugin: React.PropTypes.func,
    getPluginConfig: React.PropTypes.func,
  },

  _onConnect: function (host) {
    this.setState({changing: false})
    var k = this.props.store.globals.kernel
    k.disconnect()
    k.init(host, (err) => {
      let hosts = this.context.getPluginConfig('itreed').hosts || {}
      hosts[k.type] = host

      this.context.updatePlugin('itreed', {hosts: hosts})
      // do something on error?
    })
  },

  _onInterrupt: function (e) {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    var k = this.props.store.globals.kernel
    k.interrupt()
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
    if (!kernel) {
      k.newKernel()
    } else {
      k.useKernel(kernel)
    }
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
          remote={this.props.remote}
          onReconnect={this._onReconnect}
          onInterrupt={this._onInterrupt}
          onChange={this._onChange}
          type={this.props.type}
          host={this.state.kernelHost}
          status={this.state.kernelStatus}
          onChooseKernel={this._onChooseKernel}
          session={this.state.kernelSession}/>
      }
    </div>
  },
})

module.exports = KernelController
*/

