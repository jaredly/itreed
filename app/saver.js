
var React = require('treed/node_modules/react')
  , cx = React.addons.classSet
  , PT = React.PropTypes
  , sources = require('./sources')
  , DropDown = require('./drop-down')

var Saver = React.createClass({
  propTypes: {
    onSave: PT.func.isRequired,
    onSaveAs: PT.func.isRequired,
    onClear: PT.func.isRequired,
    // value: ?{type: , config: , saved: }
  },
  getInitialState: function () {
    return {
      loading: false,
      error: false,
    }
  },

  _onSaveAs: function (type) {
    this.props.onSaveAs(type, (err) => {
      this.setState({
        error: err,
        loading: false,
      })
    })
  },
  _onSave: function () {
    this.props.onSave((err) => {
      this.setState({
        error: err,
        loading: false,
      })
    })
  },

  _showSettings: function () {
    fail
  },

  render: function () {
    if (this.state.loading) {
      return <span>Loading...</span>
    }
    if (!this.props.value) {
      return <DropDown
        blank="Setup sync"
        options={Object.keys(sources)}
        onSelect={this._onSaveAs}/>
    }
    var source = this.props.value
    if (!this.props.value.dirty) {
      return <span>
        All changes saved to {source.type}.
        <button onClick={this._showSettings}>Settings</button>
        {this.state.error}
      </span>
    }
    return <span>
      <button onClick={this._onSave}>Save</button>
      to {source.type}.
      <button onClick={this._showSettings}>Settings</button>
      {this.state.error}
    </span>
  },
})

module.exports = Saver

