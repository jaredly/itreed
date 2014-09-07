
var React = require('treed/node_modules/react')
var Convert = require('ansi-to-html')
  , convert = new Convert()

function formatTraceback(traceback) {
  if (!traceback) return
  return plainHtml(traceback.join(''))
}

function escape(text) {
  return text.replace('&', '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function plainHtml(text) {
  return <pre dangerouslySetInnerHTML={{__html: convert.toHtml(escape(text))}}/>
}

function showOutput(output, i) {
  if (output.output_type === 'pyerr') {
    return <div className='m_IPython_error' key={i}>
      {/* Handling errors
      <div className='m_IPython_error_title'>
        <span className='m_IPython_error_name'>
          {output.ename}
        </span>
        <span className='m_IPython_error_value'>
          {output.evalue}
        </span>
      </div>
      */}
      <div className='m_IPython_error_trace'>
        {formatTraceback(output.traceback)}
      </div>
    </div>
  }
  if (output.html) {
    return <div className='m_IPython_output' key={i}
      dangerouslySetInnerHTML={{__html: output.html}}/>
  }
  // TODO: make this more expressive
  return <div className='m_IPython_output' key={i}>
    {plainHtml(output.text)}
  </div>
}

function make_outputs(outputs) {
  var streams = {
    stdout: null,
    stderr: null,
  }
  var normal = []
  // aggregate streams
  outputs.forEach((output, i) => {
    if (output.output_type !== 'stream') return normal.push(output)
    if (streams[output.stream]) {
      streams[output.stream] += output.text
    } else {
      streams[output.stream] = output.text
    }
  })
  var items = []
  if (streams.stdout) {
    items.push(<div key='stdout' className='m_IPython_stream m_IPython_stream-stdout'>{streams.stdout}</div>)
  }
  if (streams.stderr) {
    items.push(<div key='stderr' className='m_IPython_stream m_IPython_stream-stderr'>{streams.stderr}</div>)
  }

  return items.concat(normal.map(showOutput))
}

module.exports = {
  keys: {
    'execute': {
      normal: 'shift+return',
      insert: 'shift+return',
      // TODO: visual: 'shift+return',
    },
    'type ipython': {
      normal: 'ctrl+i',
    },
    'type normal': {
      normal: 'ctrl+m',
    },
  },
  store: {
    actions: {
      typeIpython: function (id) {
        if (!arguments.length) id = this.view.active
        this.set(id, 'type', 'ipython')
      },
      typeNormal: function (id) {
        if (!arguments.length) id = this.view.active
        this.set(id, 'type', 'base')
      },
      execute: function (id) {
        if (!arguments.length) id = this.view.active
        var node = this.db.nodes[id]
        if (node.type !== 'ipython') return
        document.activeElement.blur()
        this.update(id, {
          loading: true,
          outputs: [],
        })
        var add = (output, type, message) => {
          console.log('got', output, type, message)
          var outputs = this.db.nodes[id].outputs.concat([output])
          this.set(id, 'outputs', outputs)
        }
        this.globals.kernel.sendShell(this.db.nodes[id].content, {
          pyout: (m) => add({
            output_type: 'pyout',
            text: m.content.data['text/plain'],
            html: m.content.data['text/html'],
          }, 'pyout', m),
          stream: (m) => add({
            output_type: 'stream',
            stream: m.content.name,
            text: m.content.data,
          }, 'stream', m),
          pyerr: (m) => add({
            output_type: 'pyerr',
            ename: m.content.ename,
            evalue: m.content.evalue,
            traceback: m.content.traceback,
          }, 'pyerr', m),
          display_data: (m) => add({
            output_type: 'display_data',
            metadata: m.content.metadata,
            latex: m.content.data['text/latex'],
            text: m.content.data['text/plain'],
            html: m.content.data['text/html'],
          }),
          status: (m) => null,
        }, () => {
          this.update(id, {
            loading: false,
          })
        })
      },
    },
  },
  node: {
    blocks: {
      prechildren: function (node, actions, state) {
        if (node.type !== 'ipython') return
        // TODO: indicate node.language somewhere
        if (!node.loading && (!node.outputs || !node.outputs.length)) return
        return <div className='m_IPython'>
          {make_outputs(node.outputs)}
          {node.loading && <div className='m_IPython_loading'><div>Loading</div></div>}
          {/*
          <pre>{JSON.stringify(node.outputs, null, 2)}</pre>
          */}
        </div>
      }
    }
  }
}


