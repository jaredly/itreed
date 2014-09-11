
var React = require('treed/node_modules/react')
  , PT = React.PropTypes
  , Downloader = require('./downloader')
  , Uploader = require('./uploader')

var Dupload = React.createClass({
  propTypes: {
    store: PT.object.isRequired,
  },

  getInitialState: function () {
    return {
      dropping: false,
      downloading: false,
      uploading: false,
      uploadFile: null,
    }
  },

  _onDownload: function () {
    this.setState({
      downloading: true,
      uploading: false,
      uploadFile: null,
    })
  },

  _onUpload: function () {
    this.setState({
      downloading: false,
      uploading: true
    })
  },

  _onClose: function () {
    this.setState({
      downloading: false,
      uploading: false,
      uploadFile: null,
    })
  },

  // Draggage
  componentDidMount: function () {
    window.addEventListener('dragenter', this._onDragOver)
    window.addEventListener('dragover', this._onDragOver)
    window.addEventListener('dragleave', this._onDragEnd)
    window.addEventListener('drop', this._onDrop)
  },

  componentWillUnmount: function () {
    window.removeEventListener('dragenter', this._onDragOver)
    window.removeEventListener('dragleave', this._onDragEnd)
    window.removeEventListener('dragover', this._onDragOver)
    window.removeEventListener('drop', this._onDrop)
  },

  _onDragOver: function (e) {
    e.preventDefault()
    this.setState({dropping: true})
    return false
  },

  _onDragEnd: function (e) {
    if (e.target.className.indexOf('Dupload_dropping') !== -1) {
      this.setState({dropping: false})
    }
  },

  _onDrop: function (e) {
    e.preventDefault()
    e.stopPropagation()
    // TODO: tighten this up
    var file = e.dataTransfer.files[0]
    if (!file) {
      file = e.dataTransfer.items[0]
    }
    this.setState({
      uploadFile: file,
      dropping: false,
      uploading: true,
      downloading: false,
    })

    return false
  },

  render: function () {
    var modal = null
    if (this.state.downloading) {
      modal = Downloader({
        exportMany: this.props.store.db.exportMany.bind(this.props.store.db),
        ids: this.props.store.views[0].selection || [this.props.store.views[0].active],
        root: this.props.store.db.root,
        onClose: this._onClose,
      })
    } else if (this.state.uploading) {
      modal = Uploader({
        initialFile: this.state.uploadFile,
        store: this.props.store,
        onClose: this._onClose,
      })
    }

    return <div className='Dupload'>
      <span className='Dupload_download' onClick={this._onDownload}> <span/> </span>
      <span className='Dupload_upload' onClick={this._onUpload}> <span/> </span>
      {modal}
      {this.state.dropping && <div className='Dupload_dropping'>Drop here to import</div>}
    </div>
  },
})

module.exports = Dupload

