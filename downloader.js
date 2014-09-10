
var React = require('treed/node_modules/react')
  , PT = React.PropTypes
  , Modal = require('./modal')
  , FormatPicker = require('./format-picker')
  , convert = require('./convert')

var FORMATS = [
  ['nm', 'Notablemind (.nm)'],
  ['ipython', 'IPython (.pynb)'],
  ['gorilla', 'Gorilla (.clj)'],
  // ['md', 'Markdown (.md)'],
  // latex: 'Latex (.tx)',
]

var Downloader = React.createClass({
  propTypes: {
    exportTree: PT.func.isRequired,
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
      , tree = this.props.exportTree()
      , data = convert[format].strFromTree(tree)
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
    return <Modal onClose={this.props.onClose} title="Download" className="Modal-download">
      <FormatPicker formats={FORMATS} format={this.state.format} onChange={this._onChangeFormat}/>
      <input className='Download_name' value={this.state.name} onChange={this._onChangeName}/>
      .{convert[this.state.format].ext}
      <br/>
      <a className="Download_link" ref="link"
          onClick={this.onDownload}>
        Download
      </a>
    </Modal>
  }
})

module.exports = Downloader

