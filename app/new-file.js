
var React = require('treed/node_modules/react/addons')
  , cx = React.addons.classSet

var repls = {
  'None': null,
  'Python': 'ipython',
  'Clojure': 'gorilla',
  'Julia': 'ijulia',
  'Javascript': 'javascript',
}

var NewFile = React.createClass({
  getInitialState: function () {
    return {
      title: 'Untitled',
      repl: null,
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
    this.props.onSubmit(this.state.title, repls[this.state.repl])
  },

  repls: function () {
    return <ul className='NewFile_repls'>
      {Object.keys(repls).map(key =>
        <li
            onClick={this._setRepl.bind(null, key)}
            className={cx({
              'NewFile_repl': true,
              'NewFile_repl-selected': key === this.state.repl,
            })}>
          {key}
        </li>)}
    </ul>
  },

  render: function () {
    return <form className="NewFile" onSubmit={this._onSubmit}>
      <input type="text" value={this.state.title}
        onChange={this._onChange} />
      Repl
      {this.repls()}
      <button onClick={this._onSubmit}>Submit</button>
    </form>
  },
})

module.exports = NewFile
