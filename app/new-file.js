
var React = require('treed/node_modules/react/addons')
  , cx = React.addons.classSet
  , kernels = require('./kernels')

var NewFile = React.createClass({
  getInitialState: function () {
    return {
      title: 'Untitled',
      repl: 'No repl',
    }
  },
  _onChange: function (e) {
    this.setState({title: e.target.value})
  },
  _setRepl: function (key) {
    this.setState({repl: key})
  },
  _onSubmit: function (e) {
    e.preventDefault()
    e.stopPropagation()
    this.props.onSubmit(this.state.title, this.state.repl)
  },

  repls: function () {
    return <ul className='NewFile_repls'>
      {Object.keys(kernels).map(key =>
        <li
            onClick={this._setRepl.bind(null, key)}
            className={cx({
              'NewFile_repl': true,
              'NewFile_repl-selected': key === this.state.repl,
            })}>
          {kernels[key].title}
        </li>)}
    </ul>
  },

  _onShow: function () {
    this.props.onOpen(true)
  },

  _onHide: function () {
    this.props.onOpen(false)
  },

  render: function () {
    if (!this.props.open) {
      return <div onClick={this._onShow} className='NewFile NewFile-closed'>Create</div>
    }
    return <form className="NewFile" onSubmit={this._onSubmit}>
      <button className='NewFile_cancel' onClick={this._onHide}>Cancel</button>
      <h3 className="NewFile_head">New Document</h3>
      <input className='NewFile_title' type="text" value={this.state.title}
        onChange={this._onChange} />
      <button className='NewFile_submit' onClick={this._onSubmit}>Create Document</button>
      {this.repls()}
    </form>
  },
})

module.exports = NewFile
