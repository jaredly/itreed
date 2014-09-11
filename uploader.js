
var React = require('treed/node_modules/react')
  , PT = React.PropTypes
  , Modal = require('./modal')
  , FormatPicker = require('./format-picker')

var Uploader = React.createClass({
  propTypes: {
    initialFile: PT.object,
  },

  getInitialState: function () {
    return {
      mode: 'insert',
      file: this.props.initialFile,
    }
  },

  componentWillReceiveProps: function (nextProps) {
    if (nextProps.initialFile !== this.props.initialFile) {
      this.setState({file: nextProps.initialFile})
    }
  },

  _onChangeMode: function (mode) {
    this.setState({mode: mode})
  },

  _onChangeFile: function (e) {
    this.setState({file: e.target.files[0]})
  },

  _onClearFile: function () {
    this.setState({file: null})
  },

  _onSubmit: function () {
  },

  file: function () {
    if (this.state.file) {
      return <div>
        <span>{this.state.file.name + ' ' + this.state.file.size + 'kb'}</span>
        <button className='Uploader_clear' onClick={this._onClearFile}>&times;</button>
      </div>
    }
    return <input type="file" onChange={this._onChangeFile}/>
  },

  render: function () {
    return <Modal className="Modal-upload" onClose={this.props.onClose} title="Import">
      <FormatPicker
        formats={[["replace", "Replace notebook"], ["insert", "Insert at cursor"]]}
        onChange={this._onChangeMode}
        format={this.state.mode}/>
      {this.file()}
      <br/>
      <button onClick={this._onSubmit} className="Uploader_submit">Import</button>
    </Modal>
  }
})

module.exports = Uploader


