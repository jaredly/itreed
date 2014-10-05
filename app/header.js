
var React = require('treed/node_modules/react')
  , PT = React.PropTypes
  , Dupload = require('./dupload')

var Header = React.createClass({
  propTypes: {
    file: PT.object.isRequired,
    store: PT.object.isRequired,
    onClose: PT.func.isRequired,
    setPanes: PT.func.isRequired,
    changeTitle: PT.func.isRequired,
  },

  getInitialState: function () {
    return {
      title: this.props.file.title,
      editing: false,
    }
  },

  _editTitle: function () {
    this.setState({editing: true})
  },

  _onChange: function (e) {
    this.setState({title: e.target.value})
  },

  _keyDown: function (e) {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault()
      return this._doneEditing()
    }
  },

  _doneEditing: function () {
    this.props.changeTitle(this.state.title)
    this.setState({editing: false})
  },

  componentDidUpdate: function (_, prevState) {
    if (!prevState.editing && this.state.editing) {
      this.refs.input.getDOMNode().focus()
    }
  },

  render: function () {
    return <div className='Header'>
      <span className='Header_name'>Notablemind</span>
      <button className='Header_home' onClick={this.props.onClose}>
        Home
      </button>
      {this.state.editing ?
        <input
          ref="input"
          className="Header_editTitle"
          value={this.state.title}
          onBlur={this._doneEditing}
          onKeyDown={this._keyDown}
          onChange={this._onChange}/> :
        <span onClick={this._editTitle} className='Header_title'>
          {this.props.file.title}
        </span>}
      <Dupload store={this.props.store}/>
      <button
        className="Header_pane"
        onClick={this.props.setPanes.bind(null, 1)}>
        <span className='icon-1pane'/>
      </button>
      <button
        className="Header_pane"
        onClick={this.props.setPanes.bind(null, 2)}>
        <span className='icon-2pane'/>
      </button>
      <button
        className="Header_pane"
        onClick={this.props.setPanes.bind(null, 3)}>
        <span className='icon-3pane'/>
      </button>
    </div>
  }
})

module.exports = Header
