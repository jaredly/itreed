
var React = require('treed/node_modules/react')
  , treed = require('treed/rx')

// just uses localStorage to index files, and indexeddb to store them
var localFiles = require('./files')
  , Header = require('./header')
  , Browse = require('./browse')
  , history = require('./history')
  , TypeSwitcher = require('./type-switcher')

var App = React.createClass({

  getDefaultProps: function () {
    return {
      defaultType: 'tree',
      types: {
        tree: require('treed/rx/views/tree'),
        paper: require('treed/rx/views/paper'),
      }
    }
  },

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

  _setSource: function (type, options, text) {
    SOURCES[type].saveAs(text, options, (time) => {
      localFiles.update(this.state.file.id, {
        source: {
          type: type,
          options: options,
          saved: time,
        }
      }, file => {
        this.setState({file: file})
      })
    })
  },

  _onSave: function (text) {
    var source = this.state.file.source
    SOURCES[source.type].save(text, source.options, (time) => {
      source.saved = time
      localFiles.update(this.state.file.id, {
        source: source
      }, file => {
        this.setState({file: file})
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
        onSave={this._onSave}
        setSource={this._setSource}
        onClose={this._onClose}
        file={this.state.file}
        store={this.state.store}
      />
      {this.makePanes()}
    </div>
  }
})

module.exports = App


