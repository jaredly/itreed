
var React = require('react')

module.exports = {
  mime: 'json/vega',

  display: function (value, meta) {
    return <VegaViewer data={value}/>
  },

  format: function (value) {
    // TODO something here?
  }
}


var VegaViewer = React.createClass({
  componentDidMount: function () {
    this._vegaRender()
  },

  componentDidUpdate: function () {
    this._vegaRender()
  },

  _vegaRender: function () {
    var node = this.getDOMNode()
    vg.parse.spec(this.props.data, (chart) => {
      chart({
        el: node,
        renderer: 'svg',
      }).update();
    })
  },

  render: function () {
    return <div className='m_IPython_output m_IPython_output-vega'/>
  }
})

