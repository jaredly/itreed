
var React = require('treed/node_modules/react')

var KernelChanger = React.createClass({
  getInitialState: function () {
    return {host: this.props.initialValue}
  },
  _onChange: function (e) {
    this.setState({host: e.target.value})
  },
  _onDone: function () {
    this.props.onDone(this.state.host)
  },
  _onKeyDown: function (e) {
    if (e.key === 'Return') {
      this._onDone()
    }
  },
  render: function () {
    return <div className='m_IPythonKernel_changer'>
      <input
        placeholder="Gorilla-repl host"
        value={this.state.host}
        onChange={this._onChange}
        onKeyDown={this._onKeyDown}/>
      <span className='m_IPythonKernel_changer_btn' onClick={this._onDone} style={{
        padding: '5px 10px',
        color: 'green',
      }}>&#10004;</span>
      <span className='m_IPythonKernel_changer_btn' onClick={this.props.onCancel} style={{
        padding: '5px 10px',
        color: 'red',
      }}>&#10007;</span>
    </div>
  }
})

module.exports = KernelChanger

