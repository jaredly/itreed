
var React = require('treed/node_modules/react/addons')
  , PT = React.PropTypes
  , cx = React.addons.classSet
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
      whole_notebook: false,
      format: 'notablemind',
    }
  },

  onDownload: function () {
    var ids = this.state.whole_notebook ? [this.props.root] : this.props.ids
      , format = this.state.format
      , a = this.refs.link.getDOMNode()
      , trees = this.props.exportMany(ids)
      , data = convert[format].strFromTrees(trees)
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

  _setWhole: function (whole) {
    this.setState({whole_notebook: whole})
  },

  render: function () {
    var ids = this.props.ids
      , whole_notebook = this.state.whole_notebook
      , whole = false
      , what
    if (ids.length === 1) {
      if (ids[0] === this.props.root) {
        what = 'the whole notebook'
        whole = true
      } else {
        what = '1 item'
      }
    } else {
      what = ids.length + ' items'
    }
    return <Modal onClose={this.props.onClose} title="Download" className="Modal-download">
      {whole ?
        'Download the whole notebook' :
        <span>Download
          <button onClick={this._setWhole.bind(null, false)} className={cx({
            'Download_which': true,
            'Download_which-selected': !this.state.whole_notebook,
          })}>{what}</button>
          <button onClick={this._setWhole.bind(null, true)} className={cx({
            'Download_which': true,
            'Download_which-selected': this.state.whole_notebook,
          })}>the whole notebook</button>
        </span>}
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

