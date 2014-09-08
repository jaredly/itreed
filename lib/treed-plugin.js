
var React = require('treed/node_modules/react')
  , Listener = require('treed/rx/listener')

  , Gorilla = require('./Gorilla')

var KernelController = React.createClass({
  mixins: [Listener({
    storeAttrs: function (getters, props) {
      return {
        kernelHost: getters.kernelHost(),
        kernelStatus: getters.kernelStatus(),
        kernelSession: getters.kernelSession(),
      }
    },

    getListeners: function (props, events) {
      return [events.kernelStatus(), events.kernelSession()]
    },
  })],

  getInitialState: function () {
    return {
      changing: false
    }
  },

  _onConnect: function (host) {
    var k = this.props.store.globals.kernel
    k.disconnect()
    k.init(host, (err) => {
      // do something on error?
    })
  },

  _onReconnect: function () {
    this._onConnect(this.state.host)
  },

  render: function () {
    return <div className='m_IPythonKernel'>
      IPython Kernel
      {this.state.changing ?
        <KernelChanger
          initialValue={this.state.kernelHost}
          onDone={this._onConnect}/> :
        <KernelIndicator
          onReconnect={this._onReconnect}
          host={this.state.kernelHost}
          status={this.state.kernelStatus}
          session={this.state.kernelSession}/>
      }
    </div>
  },
})

module.exports = {
  keys: {
    'execute': {
      normal: 'shift+return',
      insert: 'shift+return',
      // TODO: visual: 'shift+return',
    },
    'execute deep': {
      normal: 'ctrl+shift+return',
      insert: 'ctrl+shift+return',
      // TODO: visual: 'shift+return',
    },
    'type ipython': {
      normal: 'ctrl+i',
      insert: 'ctrl+i',
    },
    'type normal': {
      normal: 'ctrl+m',
      insert: 'ctrl+m',
    },
    'toggle display collapse': {
      normal: 'space',
    },
  },

  view: {
    blocks: {
      top: function (actions, state, store) {
        kk
      },
    },
  },

  store: {
    init: function (store) {

      var kernel = store._globals.kernel = new Gorilla()
      kernel.on('session', () => {
        store.changed(store.events.kernelSession())
      })
      kernel.on('status', () => {
        store.changed(store.events.kernelStatus())
      })

    },
    actions: require('./actions'),
    getters: {
      kernelStatus: function () {
        return this.globals.kernel && this.globals.kernel.status
      },

      kernelHost: function () {
        return this.globals.kernel && this.globals.kernel.host
      },

      kernelSession: function () {
        return this.globals.kernel && this.globals.kernel.session
      },
    },
    events: {
      kernelSession: () => 'kernel-session',
      kernelState: () => 'kernel-state',
      // kernelHost: () => 'kernel-host',
    }
  },

  node: require('./node'),
}


