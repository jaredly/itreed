
var React = require('treed/node_modules/react/addons')
  , cx = React.addons.classSet

  , Convert = require('ansi-to-html')
  , convert = new Convert()

  // , katex = require('katex')
  , moment = require('moment')
  , hljs = require('highlight.js')

  , CodeEditor = require('./code-editor')
  , showTimes = require('./timer')
  , make_outputs = require('./view')

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
    belowbody: function (node, actions, state, store) {
      if (node.type !== 'ipython') return
      // TODO: indicate node.language somewhere
      var className = cx({
        'm_IPython': true,
        'm_IPython-hiding': node.display_collapsed,
        'm_IPython-empty': !(node.output && node.output.length),
      })
      return <div className={className} ref='ipython_view' onClick={actions.setActive.bind(actions, node.id)}>
        {make_outputs(node.outputs, store)}
        {showTimes(node, state.kernelSession)}
      </div>
    }
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
    func = function (line, pos, cm, done) {
      return kernel.cmComplete(cm)
    }
  } else if (kernel.complete) {
    func = function (line, pos, cm, done) {
      return kernel.complete(line, pos, done)
    }
  } else {
    return function (line, pos, cm) {
      return CodeMirror.hint.auto(cm)
    }
  }

  if (kernel.asyncComplete) {
    func.async = true
  }

  return func
}

