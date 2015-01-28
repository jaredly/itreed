
var React = require('react')
  , makeGorilla = require('./gorilla')

module.exports = {
  mime: 'json/list-like',

  display: function (value, meta) {
    return ListLikeViewer({data: value})
  },
}

var ListLikeViewer = React.createClass({
  componentDidMount: function () {
    this.doThings(this.props.data)
  },
  doThings: function (data) {
    var parts = makeGorilla(data, 0)
    var node = this.getDOMNode()
    node.innerHTML = parts[0]
    var rich = parts[2]
    for (var id in rich) {
      var dest = node.getElementsByClassName('rich-' + id)[0]
      var renderer = {
        vega: renderVega
      }[rich[id].type]
      if (!renderer) {
        console.warn('skipping the render of', rich[id].type, rich[id])
        continue;
      }
      renderer(rich[id].content, dest)
    }
  },
  render: function () {
    return <div className='m_IPython_output_list-like'/>
  }
})

function renderVega(data, node) {
  vg.parse.spec(data, (chart) => {
    chart({
      el: node,
      renderer: 'svg',
    }).update();
  })
}

