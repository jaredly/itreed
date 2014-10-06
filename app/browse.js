
var React = require('treed/node_modules/react')
  , NewFile = require('./new-file')
  , treed = require('treed/rx')
  , PT = React.PropTypes
  , history = require('./history')

var Browse = React.createClass({
  propTypes: {
    loadId: PT.string,
    files: PT.object.isRequired,
    onLoad: PT.func.isRequired,
  },

  getInitialState: function () {
    return {
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

  componentDidMount: function () {
    if (this.state.file) return
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
        {this.state.files.map(file =>
          <li className='Browse_file'
              key={file.id}
              onClick={this.loadFile.bind(null, file, false)}>
            <span className='Browse_title'>{file.title}</span>
            <span className={'Browse_repl Browse_repl-' + file.repl}/>
          </li>)}
        {!this.state.files.length &&
          <li key="empty" className='Browse_nofiles'>
            No documents saved in this browser.
          </li>}
      </ul>
      <NewFile onSubmit={this._onNewFile} />
    </div>
  }
})

module.exports = Browse

