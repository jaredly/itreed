
var React = require('react')
var katex = require('katex')

var LatexViewer = React.createClass({
  getInitialState: function () {
    return {error: null}
  },
  shouldComponentUpdate: function (nextProps, nextState) {
    return nextProps.data !== this.props.data || nextState.error !== this.state.error
  },
  componentWillReceiveProps: function (nextProps) {
    if (nextProps.data !== this.props.date) {
      this.setState({error: false})
    }
  },
  componentDidMount: function () {
    this._renderKatex()
  },
  componentDidUpdate: function () {
    this._renderKatex()
  },
  _renderKatex: function () {
    try {
      katex.render(this.props.data, this.getDOMNode())
    } catch (e) {
      this.setState({error: e})
    }
  },
  render: function () {
    if (this.state.error) {
      return <div className='m_IPython_output m_IPython_output_latex'>
        Error while rendering latex.
      </div>
    }
    return <div className='m_IPython_output m_IPython_output_latex'/>
  }
})

module.exports = {
  mime: 'text/latex',

  display: function (value, store) {
    return React.createElement(LatexViewer, {data: value})
  }
}

