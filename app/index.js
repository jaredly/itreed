
var React = require('treed/node_modules/react')
  , treed = require('treed/rx')

// just uses localStorage to index files, and indexeddb to store them
var localFiles = require('./files')
  , Header = require('./header')
  , Browse = require('./browse')
  , history = require('./history')

var ViewTypes = {
  tree: require('treed/rx/views/tree'),
  paper: require('treed/rx/views/paper'),
}

var App = React.createClass({

  getInitialState: function () {
    return {
      loadId: history.get(),
      file: null,
      store: null,
      plugins: null,
      panes: [],
    }
  },

  makePaneConfig: function (store, plugins, num, prev) {
    if (prev.length > num) return prev.slice(0, num)
    var configs = prev.slice()
    for (var i=prev.length; i<num; i++) {
      configs.push({
        type: 'tree',
        config: treed.viewConfig(store, plugins, null)
      })
    }
    return configs
  },

  componentDidMount: function () {
    // TODO: need to abstract out the logic from browse.js
    window.addEventListener('popstate', this._popState)
  },

  componentDidUpdate: function () {
    if (!this.state.store) return
    this.state.store.changed(this.state.store.events.activeViewChanged())
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
    var panes = this.state.panes.map(pane =>
      ViewTypes[pane.type](pane.config.props))
    var ids = []
    // TODO: this.state.store.setViewPositions(ids or something)
    return <div className='App_panes'>
      {panes}
    </div>
  },

  _setPanes: function (num) {
    this.setState({panes: this.makePaneConfig(this.state.store, this.state.plugins, num, this.state.panes)})
  },

  _onLoad: function (file, store, plugins) {
    window.store = store
    history.set(file.id)
    store.clearViews()
    this.setState({
      loadId: null,
      file,
      store,
      plugins,
      panes: this.makePaneConfig(store, plugins, 1, []),
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


