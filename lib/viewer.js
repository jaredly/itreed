
var React = require('react')
  , PT = React.PropTypes

var Viewer = React.createClass({
  propTypes: {
    kernel: PT.object.isRequired,
    data: PT.object.isRequired,
  },
  getInitialState: function () {
    return {
      command: '',
      events: [],
    }
  },
  _onChange: function (e) {
    this.setState({command: e.target.value})
  },
  _onSend: function () {
    var command = this.state.command
    this.setState({
      command: '',
      loading: true
    })
    this.props.kernel.sendShell(command, {
      pyin: (message) => this.got('pyin', message),
      pyout: (message) => this.got('pyout', message),
      pyerr: (message) => this.got('pyerr', message),
      status: (message) => this.got('status', message),
    }, () => this.setState({loading: false}))
  },
  got: function (event, message) {
    this.setState({
      events: this.state.events.concat([{event: event, payload: message}]),
    })
  },

  render: function () {
    return <div className='Viewer'>
      <textarea
        disabled={this.state.loading}
        value={this.state.command}
        onChange={this._onChange}/>
      <button onClick={this._onSend}>Send</button>
      {this.state.loading && 'Loading...'}
      <ul>
        {this.state.events.map((item) => <li><pre>{JSON.stringify(item, null, 2)}</pre></li>)}
      </ul>
      <pre>
        {JSON.stringify(this.props.data, null, 2)}
      </pre>
    </div>
  }
})

module.exports = Viewer

