
import classnames from 'classnames'

var React = require('react')

  , Convert = require('ansi-to-html')
  , convert = new Convert()

  , Playground = require('./components/playground')
  , CodeEditor = require('./components/code-editor')
  , Output = require('./components/output')

function codeOutput(node, actions, state, store) {
  if (node.type !== 'ipython') return
  var kernelW = store.globals.kernel && store.globals.kernel.w
    , style = kernelW && kernelW._inject_css
    , addListener = kernelW && kernelW.addInjectListener
    , removeListener = kernelW && kernelW.removeInjectListener
  return <Output
    node={node}
    key="code-output"
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
    return classnames({
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
      renderer() {
        if (this.props.node.editor_collapsed) {
          return <div onClick={_ => this.props.actions.toggleEditorCollapse(this.props.node.id)}>Editor Collapsed</div>
        }
        const itreed = this.props.node.itreed
        const key = itreed.server + ':' + itreed.kernel
        const kernel = this.props.store.globals.itreed.kernels[key]
        return <CodeEditor
          blurred={true}
          language={kernelSyntax(this.props.node, kernel)}
          node={this.props.node}
          value={this.props.node.content}
          onExecute={() => this.props.actions.execute(this.props.node.id)}
          onFocus={this._onClick}
        />
      },
      editor(props) {
        return {
          focus() {
            return this.editor.focus.apply(this.editor, arguments)
          },
          isFocused() {
            return this.editor.isFocused.apply(this.editor, arguments)
          },
          render() {
            if (props.node.editor_collapsed) {
              return <div onClick={_ => props.actions.toggleEditorCollapse(props.node.id)}>Editor Collapsed</div>
            }
            const itreed = props.node.itreed
            const key = itreed.server + ':' + itreed.kernel
            const kernel = props.store.globals.itreed.kernels[key]
            let onComplete
            if (kernel && (kernel.complete || kernel.cmComplete)) {
              onComplete = kernelComplete(kernel, props.node.itreed && props.node.itreed.variant)
            }
            return <CodeEditor
              ref={e => this.editor = e}
              language={kernelSyntax(props.node, kernel)}
              onExecute={() => props.actions.execute(props.node.id)}
              onComplete={onComplete}
              {...props}/>
          }
        }
      },
    },

    'code-playground': {
      renderer: function () {
        return <Playground
          ref="text"
          blurred={true}
          value={this.props.node.content}
          onFocus={this._onClick}
          onChange={this._onChange}
          store={this.props.store}
          node={this.props.node}/>
      },
      editor: function (props) {
        return <Playground ref="text" {...props}/>
      },
    },
  },

  listener: {
    changes: ['kernel-session'],
    updateStoreState: function (state, getters) {
      if (!state.node) return {}
      const it = state.node.itreed
      if (!it) return {}
      return {kernelSession: getters.kernelSession(it.server, it.kernel)}
    },
  },
}

function kernelSyntax(node, kernel) {
  if (!kernel) return null
  if (!node.itreed.variant || node.itreed.variant === 'default') {
    return kernel.language
  }
  if (!kernel.variants) return kernel.language
  const variant = kernel.variants[node.itreed.variant]
  if (!variant) return null
  return variant.syntax
}


function kernelComplete(kernel, variant) {
  var func
  if (kernel.cmComplete) {
    func = function (cm, done) {
      return kernel.cmComplete(cm)
    }
  } else if (kernel.complete) {
    func = function (cm, done) {
      const cursor = cm.getCursor()
      let code = ''
      for (let i=0; i<cursor.line; i++) {
        code += cm.getLine(i) + '\n'
      }
      const pos = code.length + cursor.ch
      const nums = cm.lineCount()
      for (let i=cursor.line; i<nums; i++) {
        code += cm.getLine(i) + '\n'
      }
      return kernel.complete(code.slice(0, -1), pos, cursor, variant, done)
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

