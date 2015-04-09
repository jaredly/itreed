
var React = require('react')
  , PT = React.PropTypes

var Isolate = React.createClass({
  propTypes: {
    children: PT.any.isRequired,

    autoSize: PT.bool,
    stylesheets: PT.oneOfType([PT.string, PT.array]),
    className: PT.string,
    style: PT.object,
  },

  getDefaultProps: function () {
    return {
      className: 'Isolate',
    }
  },

  componentDidMount: function () {
    this.loadChild()
  },

  componentDidUpdate: function () {
    this.loadChild()
  },

  shouldComponentUpdate: function (nextProps) {
    return nextProps.children !== this.props.children
  },

  loadChild: function () {
    var frame = this.getDOMNode()
    var doc = frame.contentDocument.body
    if (this.props.stylesheets) {
      loadCSS(this.props.stylesheets, frame.contentDocument)
    }
    React.renderComponent(<div children={this.props.children}/>, doc, () => {
      if (this.props.autoSize) {
        frame.style.height = 'auto'
        frame.style.width = 'auto'
        frame.style.height = doc.scrollHeight + 'px'
        frame.style.width = doc.scrollWidth + 'px'
      }
    })
  },

  render: function () {
    return <iframe className={this.props.className} style={this.props.style}/>
  },
})

function loadCSS(sheets, doc) {
  if ('string' === typeof sheets) {
    sheets = [sheets]
  }
  sheets.forEach(sheet => {
    var node = doc.createElement('link')
    node.rel = 'stylesheet'
    node.href = sheet
    doc.head.appendChild(node)
  })
}

module.exports = Isolate

