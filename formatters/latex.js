
var katex = require('katex')

var LatexViewer = React.createClass({
  componentDidMount: function () {
    katex.process(this.props.data, this.getDOMNode())
  },
  render: function () {
    return <div className='m_IPython_output m_IPython_output_latex'/>
  }
})

