
var React = require('treed/node_modules/react')
  , View = require('treed/rx/views/tree')
  , treed = require('treed/rx')

// just uses localStorage to index files, and indexeddb to store them
var localFiles = require('./files')
  , Header = require('./header')
  , Browse = require('./browse')

var App = React.createClass({

  getInitialState: function () {
    return {
      file: null,
      store: null,
      plugins: null,
      panes: 1,
    }
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
    return <div className='App-panes'>
      {panes}
    </div>
  },

  _onLoad: function (file, store, plugins) {
    this.setState({
      file,
      store,
      plugins
    })
  },

  _onClose: function () {
    this.setState({
      file: null,
      store: null,
      plugins: null
    })
  },

  render: function () {
    if (!this.state.store) {
      return <div className='App App-browse'>
        <Browse onLoad={this._onLoad} files={localFiles}/>
      </div>
    }
    return <div className='App'>
      <Header
        onClose={this._onClose}
        file={this.state.file}
        store={this.state.store}
      />
      {this.makePanes()}
    </div>
  }
})

module.exports = App


