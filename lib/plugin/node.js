
var React = require('react/addons')
  , cx = React.addons.classSet

  , Convert = require('ansi-to-html')
  , convert = new Convert()

  // , katex = require('katex')
  , moment = require('moment')
  , hljs = require('highlight.js')

  , CodeEditor = require('./code-editor')
  , Output = require('./output')

function codeOutput(node, actions, state, store) {
  if (node.type !== 'ipython') return
  return <Output
    node={node}
    ref="ipython_view"
    setActive={actions.setActive.bind(actions, node.id)}
    kernelSession={state.kernelSession}
    store={store}/>
}

module.exports = {
  classes: function (node, state) {
    if (node.type !== 'ipython') return
    return cx({
      'list_item-ipython-disabled': !state.kernelSession,
      'list_item-ipython-collapsed': node.display_collapsed,
      'list_item-ipython-stale': state.kernelSession !== node.session,
      'list_item-ipython-running': node.started && !node.finished,
      'list_item-ipython-waiting': node.waiting,
      'list_item-ipython-dirty': node.executed !== node.content,
    })
  },

  blocks: {
    belowbody: codeOutput,
    'focus-pane': codeOutput,
  },

  bodies: {
    ipython: {
      renderer: function () {
        return CodeEditor({
          ref: "text",
          blurred: true,
          node: this.props.node,
          value: this.props.node.content,
          onFocus: this._onClick,
        })
      },
      editor: function (props) {
        var kernel = props.store.globals.kernel
        if (kernel && (kernel.complete || kernel.cmComplete)) {
          props.onComplete = kernelComplete(kernel)
        }
        return CodeEditor(props)
      },
    }
  },

  listener: {
    changes: ['kernel-session'],
    updateStoreState: function (state, getters) {
      return {kernelSession: getters.kernelSession()}
    },
  },
}

function kernelComplete(kernel) {
  var func
  if (kernel.cmComplete) {
    func = function (cm, done) {
      return kernel.cmComplete(cm)
    }
  } else if (kernel.complete) {
    func = function (cm, done) {
      var cursor = cm.getCursor()
        , line = cm.getLine(cursor.line)
        , pos = {line: cursor.line, ch: cursor.ch}
      return kernel.complete(line, pos, done)
    }
  } else {
    return function (cm) {
      return CodeMirror.hint.auto(cm)
    }
  }

  if (kernel.asyncComplete) {
    func.async = true
  }

  return func
}

