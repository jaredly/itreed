
var showTimes = require('./timer')
  , make_outputs = require('./view')
  , React = require('react')
  , cx = React.addons.classSet

var Output = React.createClass({
  getInitialState: function () {
    return {
      popout: false,
    }
  },

  _onPopout: function () {
    var box = this.refs.outputs.getDOMNode().getBoundingClientRect()
      , w = window.open('party.html', 'Popped out output', 'location=no,menubar=no,height=' + (box.height + 20) + ',width=' + (box.width + 20))
    w.onbeforeunload = this._onClose
    w.onload = () => {
      w.document.body.className = 'm_IPython_popout-body'
      var style = w.document.createElement('style')
      style.innerHTML = this.props.styles
      w.style = style
      w.document.head.appendChild(style)
      this.setState({
        popout: w,
      })
    }
    if (this.props.addInjectListener) {
      this.props.addInjectListener(this._updateStyle)
    }
  },

  _updateStyle: function (style) {
    if (!this.state.popout) return
    this.state.popout.style.innerHTML = style
  },

  _onClose: function () {
    if (!this.isMounted()) return
    this.setState({
      popout: false
    })
  },

  componentDidUpdate: function (prevProps, prevState) {
    if (!this.state.popout) {
      if (prevState.popout && !prevState.popout.closed) {
        prevState.popout.onbeforeunload = null
        prevState.popout.close()
      }
      return
    }

    this.state.popout.style.innerHTML = this.props.styles

    var outputs = make_outputs(this.props.node.outputs, this.props.store)
      , container = <div className='m_IPython m_IPython_popout-wrapper'>{outputs}</div>
    React.render(container, this.state.popout.document.body)
  },

  componentWillUnmount: function () {
    if (this.state.popout && !this.state.popout.closed) {
      this.state.popout.onbeforeunload = null
      this.state.popout.close()
    }
    if (this.props.removeInjectListener) {
      this.props.removeInjectListener(this._updateStyle)
    }
  },

  render: function () {
    var node = this.props.node
      , store = this.props.store
    var className = cx({
      'm_IPython': true,
      'm_IPython-hiding': node.display_collapsed,
      'm_IPython-empty': !(node.output && node.output.length),
    })
    // TODO: indicate node.language somewhere
    return <div className={className} ref='ipython_view' onClick={this.props.setActive}>
      <div ref="outputs" className='m_IPython_outputs'>
        {!this.state.popout &&
          <span onClick={this._onPopout} className='m_IPython_popout-button'>
            <i className='fa fa-external-link-square'/>
          </span>}
        {this.state.popout ?
          <div onClick={this._onClose} className='m_IPython_popped-message'>Output has been popped out into a separate window. Click to get it back</div> :
          make_outputs(node.outputs, store)}
      </div>
      {showTimes(node, this.props.kernelSession)}
    </div>
  },
})

module.exports = Output

