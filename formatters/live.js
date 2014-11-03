
var React = require('treed/node_modules/react')
  , PT = React.PropTypes
  , format = require('../lib/plugin/format')

var LiveWatcher = React.createClass({
  propTypes: {
    id: PT.string,
  },

  /*
  componentDidMount: function () {
    var k = window.store._globals.kernel
    k.on(this.props.id + ':live_update', this.update)
  },
  componentWillUnmount: function () {
    var k = window.store._globals.kernel
    k.off(this.props.id + ':live_update', this.update)
  },

  componentWillReceiveProps: function (nextProps) {
    var k = window.store._globals.kernel
    k.off(this.props.id + ':live_update', this.update)
    k.on(nextProps.id + ':live_update', this.update)
    this.setState({value: nextProps.value})
  },

  getInitialState: function () {
    return {
      value: this.props.value
    }
  },

  update: function (message) {
    this.setState({value: message.content})
  },
 */

  render: function () {
    return <div className='LiveWatcher'>
      {format.display(this.props.value, this.props.store,
                      {live_id: this.props.id})}
    </div>
  },
})

function live_up(id, value) {
  var k = window.store._globals.kernel

  k._send('shell', {
    header: {
      msg_id: 36,
      msg_type: 'live_update',
      session: k.session,
      username: k.username
    }, content: {
      value: 23
    },
    metadata: {},
    parent_header: {}
  })
}

module.exports = {
  mime: 'json/live',

  display: function (value, store) {
    var id = value.id
    return LiveWatcher({id: value.id, store: store, value: value.value})
  },
}

