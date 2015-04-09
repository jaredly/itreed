
var React = require('react/addons')
  , cx = React.addons.classSet
  , less = require('less/lib/less')()
  , jsx = require('../kernels/js/jsx')
  , CodeMirrorRx = require('./codemirror-rx')
  , initFrame = require('./play-frame')

var cache = {jsx: {}, less: {}}

var SEP = '\n// @playground-split\n'

var Playground = React.createClass({

  getInitialState: function () {
    return {
      jserror: null,
      csserror: null,
    }
  },

  componentDidMount: function () {
    var frame = this.refs.out.getDOMNode()
    this._styler = initFrame(frame, this.onSelect)

    var parts = this.props.value.split(SEP)
    this.updateJSX(parts[0] || '')
    this.updateCSS(parts[1] || '')
    this._resize()

    if (!this.props.blurred) {
    var parts = this.props.value.split(SEP)
      this.refs.jsx.focus()
    }
  },

  componentDidUpdate: function (prevProps, prevState) {
    var prev = prevProps.value.split(SEP)
      , now = this.props.value.split(SEP)
    if (prev[0] !== now[0]) {
      this.updateJSX(now[0] || '')
    }
    if (prev[1] !== now[1]) {
      this.updateCSS(now[1] || '');
    }
    var frame = this.refs.out.getDOMNode()
    this._resize()
  },

  _resize: function () {
    var frame = this.refs.out.getDOMNode()
    var el = frame.contentDocument.body.firstElementChild
    if (!el) return
    var st = window.getComputedStyle(el)
      , margin = parseInt(st.marginTop) + parseInt(st.marginBottom)
    frame.style.height = el.offsetHeight + 20 + margin + 'px'
  },

  onSelect: function () {
    this.props.store.actions.setMode('normal')
    this.props.store.actions.setActive(this.props.node.id)
  },

  updateJSX: function (val) {
    var frame = this.refs.out.getDOMNode()
    try {
      var js = cache[val] || jsx(val)
      cache[val] = js
    } catch (e) {
      return this.setState({jserror: e})
    }
    try {
      var jsel = frame.contentWindow.eval(js)
      if (jsel) React.render(jsel, frame.contentDocument.body)
      if (this.state.jserror) this.setState({jserror: null})
    } catch (e) {
      this.setState({jserror: e})
    }
  },

  updateCSS: function (val) {
    var frame = this.refs.out.getDOMNode()
    if (cache[val]) {
      return this._styler.innerHTML = cache[val]
    }
    less.render(val, {}, (error, css) => {
      if (error) return this.setState({csserror: error})
      cache[val] = css.css
      this._styler.innerHTML = css.css
      if (this.state.csserror) this.setState({csserror: null})
      this._resize()
    })
  },

  setJSX: function (val) {
    var parts = this.props.value.split(SEP)
    parts[0] = val
    this.props.onChange(parts.join(SEP))
  },

  setLess: function (val) {
    var parts = this.props.value.split(SEP)
    parts[1] = val
    this.props.onChange(parts.join(SEP))
  },

  focus: function () {
    this.refs.jsx.focus()
  },

  isFocused: function () {
    return this.refs.jsx && (this.refs.jsx.isFocused() || this.refs.less.isFocused())
  },

  _toggleCollapse: function () {
    this.props.store.actions.toggleEditorCollapse(this.props.node.id)
  },

  render: function () {
    if (this.props.node.editor_collapsed && this.props.blurred) {
      return <div className='Playground Playground-collapsed'>
        <div key="collapse" className='Playground_collapse' onClick={this._toggleCollapse}/>
        <div key="out" className='Playground_out'>
          <iframe ref="out"/>
        </div>
      </div>
    }
    var parts = this.props.value.split(SEP)
      , cmProps = {
          style: {},
          indentWidth: 2,
          indentWithTabs: false,
          matchBrackets: true,
          lineNumbers: true,
          tabSize: 2,
          foldGutter: true,
          lineWrapping: true,
          viewportMargin: Infinity,
          blurred: this.props.blurred,
          gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
          onFocus: () => this.props.onFocus(),
        }
    return <div className='Playground'>
      <div key="collapse" className='Playground_collapse' onClick={this._toggleCollapse}/>
      <div className='Playground_code'>
        <CodeMirrorRx
          ref="jsx"
          mode='javascript'
          smartIndent={false}
          value={parts[0] || ''}
          onBlur={this.props.onBlur}
          goDown={() => this.refs.less.focus()}
          onChange={this.setJSX} {...cmProps}/>
        <CodeMirrorRx
          ref="less"
          mode='css'
          smartIndent={true}
          value={parts[1] || ''}
          onBlur={this.props.onBlur}
          goUp={() => this.refs.jsx.focus()}
          onFocus={() => this.props.onFocus()}
          onChange={this.setLess} {...cmProps}/>
        <div className='Playground_error'>
          {this.state.jserror}
          {this.state.csserror}
        </div>
      </div>
      <div key="out" className='Playground_out'>
        <iframe ref="out"/>
      </div>
    </div>
  },
})

module.exports = Playground



