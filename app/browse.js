
var React = require('treed/node_modules/react')
  , NewFile = require('./new-file')
  , treed = require('treed/rx')
  , PT = React.PropTypes

var kernelConfig = {
  null: null,
  'ipython': {
    type: 'ipython',
    language: 'python'
  },
  'gorilla': {
    type: 'gorilla',
    language: 'clojure'
  },
  'ijulia': {
    type: 'ipython',
    language: 'julia'
  }
}


var Browse = React.createClass({
  propTypes: {
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
      var id = window.location.search.slice(1)
      if (id) {
        var found = files.some(file => {
          if (file.id !== id) return false
          this.setState({
            files: files,
            loading: true
          })
          this.loadFile(file)
          return true
        })
        if (found) {
          return
        }
      }
      this.setState({files, loading: false})
    })
  },

  loadFile: function (file) {
    this.setState({loading: true})

    this.props.files.get(file, this.initFile)
  },

  _onNewFile: function (title, repl) {
    this.setState({loading: true})

    this.props.files.create(title, repl, this.initFile)
  },

  initFile: function (file, pl) {
    var config = kernelConfig[file.repl]
    var plugins = [
      require('treed/rx/plugins/undo'),
      require('treed/rx/plugins/collapse'),
      require('treed/rx/plugins/clipboard'),
      require('treed/rx/plugins/types'),

      require('treed/rx/plugins/rebase'),
    ]
    if (config) {
      // repl
      plugins.unshift(require('../lib/plugin')(config.type, config.language))
    }

    var storeOptions = {
      data: {content: file.title, children: [{content: 'Add a child'}]},
      pl: pl,
    }

    treed.initStore(plugins, storeOptions, (store) => {
//        var config = treed.viewConfig(store, plugins, null)
//        window.store = store
//        window.actions = config.view.actions

      this.props.onLoad(store, plugins)
    })
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
          <li key={file.id} onClick={this.loadFile.bind(null, file)}>
            <span className='Browse_title'>{file.title}</span>
            <span className={'Browse_repl Browse_repl-' + file.repl}/>
          </li>)}
      </ul>
      <NewFile onSubmit={this._onNewFile} />
    </div>
  }
})

module.exports = Browse

