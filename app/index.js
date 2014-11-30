
var React = require('treed/node_modules/react')
  , treed = require('treed/rx')

// just uses localStorage to index files, and indexeddb to store them
var localFiles = require('./files')
  , Header = require('./header')
  , Browse = require('./browse')
  , Saver = require('./saver')
  , SOURCES = require('./sources')
  , history = require('./history')
  , TypeSwitcher = require('./type-switcher')

var App = React.createClass({

  getDefaultProps: function () {
    return {
      defaultType: 'tree',
      noHome: false,
      loaded: false,
      types: {
        tree: require('treed/rx/views/tree'),
        paper: require('treed/rx/views/paper'),
      }
    }
  },

  getInitialState: function () {
    if (this.props.preload) {
      this._listenToStore(this.props.preload.store)
      return {
        file: this.props.preload.file,
        store: this.props.preload.store,
        plugins: this.props.preload.plugins,
        panes: this.makePaneConfig(this.props.preload.store, this.props.preload.plugins, 1, []),
      }
    }
    return {
      loadId: history.get(),
      file: null,
      store: null,
      plugins: null,
      panes: [],
    }
  },

  _listenToStore: function (store) {
    store.on(['changed'], this._onDirty)
    store.on(['node:' + store.db.root], this._onRootChanged)
  },

  _onDirty: function () {
    var source = this.state.file.source
    source.modified = Date.now()
    source.dirty = true
    localFiles.update(this.state.file.id, {
      source: source
    }, file => this.setState({file: file}))
  },

  _onRootChanged: function () {
    var db = this.state.store.db
      , title = db.nodes[db.root].content
    if (title.length > 100) {
      title = title.slice(0, 98) + '..'
    }
    this._changeTitle(title)
  },

  _unlistenToStore: function (store) {
    store.off(['changed'], this._onDirty)
    store.off(['node:' + store.db.root], this._onRootChanged)
  },

  makePaneConfig: function (store, plugins, num, prev) {
    if (prev.length >= num) return prev.slice(0, num)
    var configs = prev.slice()
    for (var i=prev.length; i<num; i++) {
      configs.push({
        type: this.props.defaultType,
        config: treed.viewConfig(store, plugins, null)
      })
    }
    for (var i=0; i<configs.length; i++) {
      if (i > 0) {
        configs[i - 1].config.view.view.windowRight = configs[i].config.view.id
      }
      if (i < configs.length - 1) {
        configs[i + 1].config.view.view.windowLeft = configs[i].config.view.id
      }
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
    if (this.state.store) {
      this.state.store.teardown()
      this._unlistenToStore(this.state.store)
    }
    var id = history.get()
    this.setState({
      loadId: id,
      file: null,
      store: null,
      plugins: null,
    })
  },

  _changePaneType: function (i, type) {
    var panes = this.state.panes.slice()
    panes[i].type = type
    this.setState({panes: panes})
  },

  makePanes: function () {
    var plugins = []
    var panes = this.state.panes.map((pane, i) => {
      var statusbar = []
      pane.config.props.plugins.map(plugin => {
        if (!plugin.statusbar) return
        statusbar.push(plugin.statusbar(pane.config.props.store))
      })
      return <div className='App_pane'>
        {/* todo add filename here once we go multi-file */}
        <div className='App_pane_top'>
          {statusbar}
          <TypeSwitcher
            types={this.props.types}
            type={pane.type}
            onChange={this._changePaneType.bind(null, i)}/>
        </div>
        <div className='App_pane_scroll'>
          {this.props.types[pane.type](pane.config.props)}
        </div>
      </div>})
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
    this._listenToStore(store)
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
    if (this.state.store) {
      this.state.store.teardown()
      this._unlistenToStore(this.state.store)
    }
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

  _clearSource: function (done) {
    localFiles.update(this.state.file.id, {source: null}, done)
  },

  _setSource: function (type, done) {
    var store = this.state.store
      , text = JSON.stringify(store.db.exportTree(), null, 2)
      , title = store.db.nodes[store.db.root].content
    SOURCES[type].saveAs(title, text, (err, config, time) => {
      if (err) return done(new Error('Failed to set source'))
      localFiles.update(this.state.file.id, {
        source: {
          type: type,
          config: config,
          saved: time,
          dirty: false,
        }
      }, file => {
        this.setState({file: file})
        done()
      })
    })
  },

  _onSave: function (done) {
    var source = this.state.file.source
    var store = this.state.store
      , text = JSON.stringify(store.db.exportTree(), null, 2)
      , title = store.db.nodes[store.db.root].content
    source.dirty = false // TODO is this in the right place?
    SOURCES[source.type].save(title, text, source.config, (err, config, time) => {
      if (err) return done(new Error('Failed to save'))
      source.saved = time
      localFiles.update(this.state.file.id, {
        source: source
      }, file => {
        this.setState({file: file})
        done()
      })
    })
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
        onClose={!this.props.noHome && this._onClose}
        file={this.state.file}
        store={this.state.store}
        saver={<Saver
          onSave={this._onSave}
          onSaveAs={this._setSource}
          onClear={this._clearSource}
          value={this.state.file.source}
          />}
      />
      {this.makePanes()}
    </div>
  }
})

module.exports = App


