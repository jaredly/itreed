
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
      {format.display(null, this.props.value, this.props.store,
                      {live_id: this.props.id})}
    </div>
  },
})

module.exports = {
  mime: 'json/live',

  display: function (value, store) {
    var id = value.id
    return LiveWatcher({id: value.id, store: store, value: value.value})
  },
}

