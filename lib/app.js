
var React = require('react')
var NotebookViewer = require('./viewer')

var App = React.createClass({
  render: function () {
    return <div className="App">
      <h1>iTreed</h1>
      <NotebookViewer
        host="localhost:8889"
        path="test.ipynb" />
    </div>
  }
})

module.exports = App

