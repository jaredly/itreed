
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
      files: null,
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
    this.setState({loading: true})

    this.props.files.get(file.id, pl =>
      this.props.files.init(file, pl, (store, plugins) =>
        this.props.onLoad(file, store, plugins)
      )
    )
  },

  _onNewFile: function (title, repl) {
    this.setState({loading: true})

    this.props.files.create(title, repl, (file, pl) =>
      this.props.files.init(file, pl, (store, plugins) => {
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
      <ul className='Browse_files'>
        {this.state.files.map(file =>
          <li key={file.id} onClick={this.loadFile.bind(null, file, false)}>
            <span className='Browse_title'>{file.title}</span>
            <span className={'Browse_repl Browse_repl-' + file.repl}/>
          </li>)}
      </ul>
      <NewFile onSubmit={this._onNewFile} />
    </div>
  }
})

module.exports = Browse

