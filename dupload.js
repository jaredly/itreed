
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
      downloading: false,
      uploading: false,
    }
  },

  _onDownload: function () {
    this.setState({downloading: true, uploading: false})
  },

  _onUpload: function () {
    this.setState({downloading: false, uploading: true})
  },

  _onClose: function () {
    this.setState({downloading: false, uploading: false})
  },

  render: function () {
    var modal = null
    if (this.state.downloading) {
      modal = Downloader({
        exportTree: this.props.store.db.exportTree.bind(this.props.store.db),
        onClose: this._onClose,
      })
    } else if (this.state.uploading) {
      modal = Uploader({
        store: this.props.store,
        onClose: this._onClose,
      })
    }

    return <div className='Dupload'>
      <span className='Dupload_download' onClick={this._onDownload}> <span/> </span>
      <span className='Dupload_upload' onClick={this._onUpload}> <span/> </span>
      {modal}
    </div>
  },
})

module.exports = Dupload

