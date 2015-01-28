/**
 * bootstrap the app into document.body
 */

var React = require('react')
var treed = require('treed')
var App = require('./app')

var files = require('./app/files')
var MemPL = require('treed/rx/pl/mem')

window.run_require = require
window.React = React

/** setup formatters **/
var format = require('./lib/plugin/format')

var formatters = [
  require('./formatters/live'),
  require('./formatters/live-button'),
  require('./formatters/react'),
  require('./formatters/vega'),
  // require('./formatters/image'),
  require('./formatters/list-like'),
  require('./formatters/js'),
]

formatters.map(plugin => {
  if (plugin.display) {
    format.displayer(plugin.display, plugin.mime)
  }
  if (plugin.format) {
    format.formatter(plugin.format, plugin.mime)
  }
})

/** done formatting **/

var Loader = React.createClass({
  getInitialState: function () {
    if (window.location.hash.length > 1) {
      return {
        value: window.location.hash.slice(1),
        loading: true,
      }
    }
    return {
      value: 'username/gistid',
      loading: false,
    }
  },

  componentDidMount: function () {
    if (this.state.loading) {
      this._onLoad()
    }
  },

  _onLoad: function () {
    this.setState({loading: true})
    getGist(this.state.value, (err, text) => {
      if (err) {
        return this.setState({
          loading: false,
          error: 'Failed to load... invalid gist id?',
        })
      }
      var data
      try {
        data = JSON.parse(text)
      } catch (e) {
        return this.setState({
          loading: false,
          error: 'Invalid format; is that a real nm document?',
        })
      }
      this.setState({loading: false})
      this.props.onLoad(data)
    })
  },

  _onChange: function (e) {
    this.setState({value: e.target.value})
  },

  render: function () {
    if (this.state.loading) {
      return <div>Loading...</div>
    }
    return <div className='Loader'>
      <h3>Load a Notablemind document from a gist</h3>
      <input className='Loader_input' value={this.state.value} onChange={this._onChange}/>
      <button onClick={this._onLoad}>Load Gist</button>
      {this.state.error && <div className='Loader_error'>{this.state.error}</div>}
    </div>
  },
})

var Viewer = React.createClass({
  getInitialState: function () {
    return {
      preload: null
    }
  },

  _onLoad: function (data) {
    var file = {
      repl: 'ijs',
      title: 'Loaded',
    }
    files.init(file, new MemPL(), data, (err, store, plugins) => {
      window.store = store
      this.setState({
        preload: {
          file: file,
          store: store,
          plugins: plugins,
        },
      })
    })
  },

  render: function () {
    return <div className='Viewer'>
      {this.state.preload ?
        App({
          noHome: true,
          preload: this.state.preload
        }) :
        Loader({onLoad: this._onLoad})}
    </div>
  },
})

function getGist(which, done) {
  var url = 'https://gist.githubusercontent.com/' + which + '/raw/'
    , x = new XMLHttpRequest()
  x.open('get', url)
  x.onreadystatechange = function () {
    if (x.readyState !== 4) return
    done(null, x.responseText)
  }
  x.onerror = function () {
    done(new Error())
  }
  x.send()
}

window.onload = function () {
    React.renderComponent(Viewer({
    }), document.body)
}

