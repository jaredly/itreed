
var React = require('treed/node_modules/react')
  , NewFile = require('./new-file')
  , Dropload = require('./dropload')
  , readFile = require('./read-file')
  , treed = require('treed/rx')
  , cx = React.addons.classSet
  , PT = React.PropTypes
  , history = require('./history')
  , kernels = require('./kernels')

var Browse = React.createClass({
  propTypes: {
    loadId: PT.string,
    files: PT.object.isRequired,
    onLoad: PT.func.isRequired,
  },

  getInitialState: function () {
    return {
      configuring: false,
      loading: true,
      error: null,
      files: null,
    }
  },

  componentDidUpdate: function (prevProps) {
    if (!prevProps.loadId && this.props.loadId) {
      this.state.files.some(file => {
        if (file.id !== this.props.loadId) return false
        this.setState({
          error: null,
          loading: true
        })
        this.loadFile(file, true)
        return true
      })
    }
  },

  loadFiles: function () {
    this.props.files.list(files => {
      // var id = history.get()
      if (this.props.loadId) {
        var found = files.some(file => {
          if (file.id !== this.props.loadId) return false
          this.setState({
            error: null,
            files: files,
            loading: true
          })
          this.loadFile(file, true)
          return true
        })
        if (found) {
          return
        }
      }
      this.setState({files, loading: false})
    })
  },

  componentDidMount: function () {
    if (this.state.file) return
    this.loadFiles()
  },

  loadFile: function (file, autoload) {
    if (!autoload) {
      history.set(file.id)
    }
    this.setState({error: null, loading: true})

    this.props.files.get(file.id, pl =>
      this.props.files.init(file, pl, (err, store, plugins) => {
        if (err) {
          return this._onError(err)
        }
        this.props.onLoad(file, store, plugins)
      })
    )
  },

  _onError: function (err) {
    this.setState({loading: false, error: err})
  },

  _onNewFile: function (title, repl) {
    this.setState({error: null, loading: true})

    this.props.files.create(title, repl, (file, pl) =>
      this.props.files.init(file, pl, (err, store, plugins) => {
        if (err) {
          return this._onError(err)
        }
        this.props.onLoad(file, store, plugins)
      })
    )
  },

  _onEditFile: function (file, e) {
    e.preventDefault()
    this.setState({configuring: file.id})
  },

  fileItem: function (file) {
    return <li className='Browse_file'
        key={file.id}>
      <div onContextMenu={this._onEditFile.bind(null, file)}
          onClick={this.loadFile.bind(null, file, false)}
          className='Browse_file_listing'>
        <span className='Browse_title'>{file.title}</span>
        <span className={'Browse_repl Browse_repl-' + file.repl}/>
      </div>
      {file.id === this.state.configuring &&
        this.renderConfig(file)}
    </li>
  },

  _setRepl: function (file, repl) {
    this.props.files.update(file.id, {repl: repl === 'null' ? null: repl}, () => {
      this.loadFiles()
    })
  },

  _onRemoveFile: function (file) {
    this.props.files.remove(file.id, this.loadFiles)
  },

  _onDoneConfig: function () {
    this.setState({configuring: false})
  },

  _onImport: function (files) {
    if (!files.length) return;
    // TODO what about multiple files?
    var reader = readFile(files[0], (err, text) => {
      if (err) {
        return this.setState({
          importError: err.message,
          importing: false,
        })
      }
      this.setState({importError: null, importing: false})
      this.props.files.importRaw(text, err => {
        if (err) {
          return this.setState({
            importError: err.message,
            importing: false,
          })
        }
        this.loadFiles()
      })
    })
    this.setState({
      importing: reader,
      importError: false,
    })
  },

  // TODO: WORK HERE -- get this all awesome. Also remove file
  renderConfig: function (file) {
    // TODO: enable individual plugins. that would be cool.
    return <div className='Browse_config'>
      <ul className='Browse_config_repls'>
        {Object.keys(kernels).map(key =>
          <li
              onClick={this._setRepl.bind(null, file, key)}
              className={cx({
                'Browse_config_repl': true,
                'Browse_config_repl-selected': key === file.repl + '',
              })}>
            {kernels[key].title}
          </li>)}
      </ul>
      <button className='Browse_config_remove' onClick={this._onRemoveFile.bind(null, file)}>Remove File</button>
      <button className='Browse_config_done' onClick={this._onDoneConfig.bind(null, file)}>Done Config</button>
      {/* TODO: download button */}
    </div>;
  },

  render: function () {
    if (this.state.loading) {
      return <div className='Browse Browse-loading'>
        Loading...
      </div>
    }
    return <div className='Browse'>
      <h3 className='Browse_head'>Open a Document</h3>
      {this.state.error && 'Error loading file!'}
      <ul className='Browse_files'>
        {this.state.files.map(this.fileItem)}
        {!this.state.files.length &&
          <li key="empty" className='Browse_nofiles'>
            No documents saved in this browser.
          </li>}
      </ul>
      <NewFile onSubmit={this._onNewFile} />
      <Dropload onDrop={this._onImport} message="Drop anywhere to import"/>
    </div>
  }
})

module.exports = Browse

