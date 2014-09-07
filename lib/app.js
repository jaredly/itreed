
var React = require('react')
var NotebookViewer = require('./viewer')

  , Kernel = require('./kernel')

var App = React.createClass({
  getDefaultProps: function () {
    return {
      initialHost: "localhost:8889",
      initialPath: "test.ipynb",
    }
  },
  getInitialState: function () {
    return {
      kernel: new Kernel(this.props.initialHost, this.props.initialPath),
      host: this.props.initialHost,
      path: this.props.initialPath,
      loading: true,
      data: null,
    }
  },
  componentDidMount: function () {
    window.kernel = this.state.kernel
    this.state.kernel.init((data) => {
      this.setState({data: data, loading: false})
    })
  },
  render: function () {
    return <div className="App">
      <h1>iTreed</h1>
      {this.state.loading ?
        'Loading...' :
        <NotebookViewer
          kernel={this.state.kernel}
          data={this.state.data}/>}
    </div>
  }
})

module.exports = App

