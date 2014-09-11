
var React = require('treed/node_modules/react')
  , PT = React.PropTypes
  , Modal = require('./modal')
  , FormatPicker = require('./format-picker')
  , convert = require('./convert')

var Downloader = React.createClass({
  propTypes: {
    exportMany: PT.func.isRequired,
    onClose: PT.func.isRequired,
  },

  getInitialState: function () {
    return {
      name: 'Notablemind-repl-session',
      format: 'nm',
    }
  },

  onDownload: function () {
    var format = this.state.format
      , a = this.refs.link.getDOMNode()
      , trees = this.props.exportMany(this.props.ids)
      , data = convert[format].strFromTrees(tree)
      , mime = convert[format].mime
      , blob = new Blob([data], {type: mime})
      , url = URL.createObjectURL(blob)
    a.href = url
    a.download = this.fileName()
  },

  fileName: function () {
    return this.state.name + '.' + convert[this.state.format].ext
  },

  _onChangeName: function (e) {
    this.setState({name: e.target.value})
  },

  _onChangeFormat: function (format) {
    this.setState({format: format})
  },

  render: function () {
    var ids = this.props.ids
      , what
    if (ids.length === 1) {
      if (ids[0] === this.props.root) {
        what = 'the whole notebook'
      } else {
        what = '1 item'
      }
    } else {
      what = ids.length + ' items'
    }
    return <Modal onClose={this.props.onClose} title="Download" className="Modal-download">
      Download {what}
      <FormatPicker formats={convert.formats} format={this.state.format} onChange={this._onChangeFormat}/>
      File name:
      <input className='Download_name' value={this.state.name} onChange={this._onChangeName}/>
      <span className='Download_ext'>.{convert[this.state.format].ext}</span>
      <br/>
      <a className="Download_link" ref="link"
          onClick={this.onDownload}>
        Download
      </a>
    </Modal>
  }
})

module.exports = Downloader

