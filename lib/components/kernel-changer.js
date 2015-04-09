
var React = require('react')

var KernelChanger = React.createClass({
  getInitialState: function () {
    return {
      host: this.props.initialValue || 'localhost:8002',
      type: this.props.initialType,
    }
  },
  _onChange: function (e) {
    this.setState({host: e.target.value})
  },
  _setType: function (type) {
    this.setState({type: type})
  },
  _onDone: function () {
    this.props.onDone(this.state.host)
  },
  _onKeyDown: function (e) {
    if (e.key === 'Enter') {
      this._onDone()
    }
  },
  render: function () {
    return <div className='m_IPythonKernel_changer'>
      {/** not going to use this
      <span
        className={
          'm_IPythonKernel_changer_btn' + (type==='ipython' ? ' m_IPythonKernel_changer_btn-active' : '')
        }
        onClick={this._setType.bind(null, 'ipython')}>
        P
      </span>
      <span
        className={
          'm_IPythonKernel_changer_btn' + (type==='gorilla' ? ' m_IPythonKernel_changer_btn-active' : '')
        }
        onClick={this._setType.bind(null, 'gorilla')}>
        G
      </span>
      **/}
      <input
        placeholder={(this.props.type === 'ipython' ? 'iPython' : "Gorilla-repl") + " host"}
        value={this.state.host}
        onChange={this._onChange}
        onKeyDown={this._onKeyDown}/>
      <span className='m_IPythonKernel_changer_btn' onClick={this._onDone} style={{
        color: 'green',
      }}>&#10004;</span>
      <span className='m_IPythonKernel_changer_btn' onClick={this.props.onCancel} style={{
        color: 'red',
      }}>&#10007;</span>
    </div>
  }
})

module.exports = KernelChanger

