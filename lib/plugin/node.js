
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
  var kernelW = store.globals.kernel && store.globals.kernel.w
    , style = kernelW && kernelW._inject_css
    , addListener = kernelW && kernelW.addInjectListener
    , removeListener = kernelW && kernelW.removeInjectListener
  return <Output
    node={node}
    ref="ipython_view"
    styles={style}
    addInjectListener={addListener}
    removeInjectListener={removeListener}
    setActive={actions.setActive.bind(actions, node.id)}
    kernelSession={state.kernelSession}
    store={store}/>
}

module.exports = {
  classes: function (node, state) {
    if (node.type !== 'ipython') return
    return cx({
      'TreeItem-ipython-disabled': !state.kernelSession,
      'TreeItem-ipython-collapsed': node.display_collapsed,
      'TreeItem-ipython-stale': state.kernelSession !== node.session,
      'TreeItem-ipython-running': node.started && !node.finished,
      'TreeItem-ipython-waiting': node.waiting,
      'TreeItem-ipython-dirty': node.executed !== node.content,
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

