
var React = require('treed/node_modules/react')
  , PT = React.PropTypes

function stringify(value) {
  try {
    return JSON.stringify(value)
  } catch (e) {}
  try {
    return value + ''
  } catch (e) {} // security error
  return "Could not display value due to a security error"
}

var Stater = React.createClass({
  propTypes: {
    attr: PT.string,
    cb: PT.string,
    initial: PT.any,
    extra: PT.object,
    comp: PT.component,
    show: PT.bool,
  },
  getDefaultProps: function () {
    return {
      attr: 'value',
      cb: 'onChange',
      initial: '',
      extra: {},
      show: false,
    }
  },
  getInitialState: function () {
    return {value: this.props.initial}
  },
  render: function () {
    var C = this.props.comp
      , props = this.props.extra
    props[this.props.attr] = this.state.value
    props[this.props.cb] = value => this.setState({value: value})
    var el = React.createElement(C, props, this.props.children)
    if (this.props.show) {
      return <div>
        {el}
        <pre>{stringify(this.state.value)}</pre>
        </div>
    }
    return el
  }
})

module.exports = Stater

