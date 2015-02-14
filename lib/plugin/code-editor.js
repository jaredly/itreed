
var React = require('react/addons')
  , CodeMirror = require('codemirror')
  , cx = React.addons.classSet
  , PT = React.PropTypes

require('codemirror/mode/javascript/javascript')
require('codemirror/mode/clojure/clojure')
require('codemirror/mode/python/python')
require('codemirror/mode/julia/julia')
require('codemirror/mode/rust/rust')
require('codemirror/mode/css/css')

require('codemirror/addon/fold/foldcode')
require('codemirror/addon/fold/foldgutter')
require('codemirror/addon/fold/brace-fold')
require('codemirror/addon/fold/xml-fold')
require('codemirror/addon/fold/comment-fold')

require('codemirror/addon/edit/closebrackets')
require('codemirror/addon/edit/matchbrackets')

require('codemirror/addon/hint/javascript-hint')
require('codemirror/addon/hint/show-hint')

var CodeEditor = React.createClass({
  propTypes: {
    node: PT.object,
    value: PT.string,
    blurred: PT.bool,
    onBlur: PT.func,
    onFocus: PT.func,
    onChange: PT.func,
    onFOcus: PT.func,
    onComplete: PT.func,
    goDown: PT.func,
    goUp: PT.func,
  },

  isFocused: function () {
    return this._cm.hasFocus()
  },

  focus: function (at) {
    if (!this._cm.hasFocus()) {
      this._cm.focus()
      if (at === 'end' || !at) {
        this._cm.setCursor(this._cm.lineCount(), 0)
      } else if (at !== 'start') {
        console.warn('Selecting in the middle not supported')
        this._cm.setCursor(this._cm.lineCount(), 0)
      } else {
        this._cm.setCursor(0, 0)
      }
    }
  },

  _onKeyDown: function (editor, e) {
    if (!this.isMounted()) return
    if (this.props.blurred && this.props.onFocus) {
      this.props.onFocus()
    }
    if (editor.state.completionActive && e.keyCode !== 27) {
      e.stopPropagation()
      return
    }
    if (e.keyCode === 9) return e.stopPropagation()
    // ctrl + return
    if (e.keyCode === 13 && e.ctrlKey) {
      var curs = editor.getCursor()
        , text = editor.getValue()
        , pos = text.split('\n').slice(0, curs.line).join('\n').length + curs.ch + 1
      if (pos < text.length) {
        var pre = text.slice(0, pos)
          , post = text.slice(pos)
        this.props.onChange(pre)
        editor.setValue(pre)
        this.props.createAfter(null, pre, post)
      } else {
        this.props.createAfter()
      }
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
      return
    }
    if (e.keyCode === 38) { // up
      // if (editor.getCursor().line === 0) {
      var curs = editor.getCursor()
      if (curs.line === 0 && curs.ch === 0) {
        return this.props.goUp()
      }
    } else if (e.keyCode === 37) { // left
      var curs = editor.getCursor()
      if (curs.line === 0 && curs.ch === 0) {
        return this.props.goUp()
      }
    } else if (e.keyCode === 40) { // down
      // if (editor.getCursor().line === editor.lineCount() - 1) {
      var curs = editor.getCursor()
      if (curs.line === editor.lineCount() - 1 && curs.ch === editor.getLine(curs.line).length) {
        return this.props.goDown()
      }
    } else if (e.keyCode === 39) { // right
      var curs = editor.getCursor()
      if (curs.line === editor.lineCount() - 1 && curs.ch === editor.getLine(curs.line).length) {
        return this.props.goDown(true)
      }
    }
  },

  componentDidMount: function () {
    var betterTab = function (cm) {
      if (cm.somethingSelected()) {
        return cm.indentSelection("add");
      }
      // var onComplete = this.props.onComplete
      var cursor = cm.getCursor()
        , line = cm.getLine(cursor.line)
        , pos = {line: cursor.line, ch: cursor.ch}
      if (cursor.ch > 0 && line[cursor.ch - 1] !== ' ') {
        return cm.showHint({hint: this.props.onComplete})
      }
      cm.replaceSelection(Array(cm.getOption("indentUnit") + 1).join(" "), "end", "+input");
    }.bind(this)

    function betterShiftTab(cm) {
      cm.execCommand('indentLess')
    }

    var minLengthForLinos = 10

    var lang = this.props.language || this.props.node.language
    this._cm = CodeMirror(this.getDOMNode(), {
      value: this.props.value,
      lineNumbers: this.props.value.split('\n').length > minLengthForLinos,
      matchBrackets: true,
      autoCloseBrackets: '()[]{}""',
      indentUnit: 2,
      indentWithTabs: false,
      smartIndent: lang !== 'javascript',
      tabSize: 2,
      lineWrapping: true,
      mode: lang,
      viewportMargin: Infinity,
      extraKeys: {
        Tab: betterTab,
        'Shift-Tab': betterShiftTab,
      },
    })

    this._cm.on('keydown', this._onKeyDown)
    this._cm.on('change', (editor) => {
      if (!this.isMounted()) return
      var value = editor.getValue()
      if (this.props.onChange) this.props.onChange(value)
      if (value.split('\n').length > minLengthForLinos) {
        this._cm.setOption('lineNumbers', true)
      } else {
        this._cm.setOption('lineNumbers', false)
      }
    })
    this._cm.on('focus', () => {
      if (!this.isMounted()) return
      if (this.props.onFocus && this.props.blurred) this.props.onFocus()
    })
    this._cm.on('blur', () => {
      if (!this.isMounted()) return
      if (this.props.onBlur && !this.props.blurred) {
        var value = this._cm.getValue()
        if (this.props.value !== value) {
          this.props.onChange(value)
        }
        this.props.onBlur()
      }
    })
    if (!this.props.blurred) {
      this._cm.focus()
    }
  },

  componentWillReceiveProps: function (nextProps) {
    if (this._cm.getValue() !== nextProps.value && this.props.blurred) {
      this._cm.setValue(nextProps.value)
    }
  },

  render: function () {
    return <div className='ITreedCodeEditor'>
      <div onClick={this.props.onExecute} className='ITreedRunButton'></div>
    </div>
  }
})

module.exports = CodeEditor

