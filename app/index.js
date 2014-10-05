
var React = require('treed/node_modules/react')
  , View = require('treed/rx/views/tree')
  , treed = require('treed/rx')

// just uses localStorage to index files, and indexeddb to store them
var localFiles = require('./files')
  , Header = require('./header')
  , Browse = require('./browse')
  , history = require('./history')

var App = React.createClass({

  getInitialState: function () {
    return {
      loadId: history.get(),
      file: null,
      store: null,
      plugins: null,
      panes: 1,
    }
  },

  componentDidMount: function () {
    // TODO: need to abstract out the logic from browse.js
    window.addEventListener('popstate', this._popState)
  },

  _popState: function () {
    var id = history.get()
    this.setState({
      loadId: id,
      file: null,
      store: null,
      plugins: null,
    })
  },

  makePanes: function () {
    var panes = []
      , ids = []
      , config
    this.state.store.clearViews()
    for (var i=0; i<this.state.panes; i++) {
      config = treed.viewConfig(this.state.store, this.state.plugins, null)
      ids.push(config.view.id)
      panes.push(View(config.props))
    }
    // TODO: this.state.store.setViewPositions(ids or something)
    return <div className='App_panes'>
      {panes}
    </div>
  },

  _setPanes: function (num) {
    this.setState({panes: num})
  },

  _onLoad: function (file, store, plugins) {
    window.store = store
    history.set(file.id)
    this.setState({
      loadId: null,
      file,
      store,
      plugins
    })
  },

  _onClose: function () {
    history.set('')
    this.setState({
      loadId: null,
      file: null,
      store: null,
      plugins: null
    })
  },

  _changeTitle: function (title) {
    localFiles.update(this.state.file.id, {title: title}, file => this.setState({file: file}))
  },

  render: function () {
    if (!this.state.store) {
      return <div className='App App-browse'>
        <Browse onLoad={this._onLoad} loadId={this.state.loadId} files={localFiles}/>
      </div>
    }
    return <div className='App'>
      <Header
        setPanes={this._setPanes}
        changeTitle={this._changeTitle}
        onClose={this._onClose}
        file={this.state.file}
        store={this.state.store}
      />
      {this.makePanes()}
    </div>
  }
})

module.exports = App


