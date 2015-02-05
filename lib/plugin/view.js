
var Convert = require('ansi-to-html')
  , convert = new Convert()
  , format = require('./format')
  , React = require('react')

module.exports = make_outputs

/**
 * format a list of outputs, displaying the highest ranking output type that
 * has a renderer registered.
 *
 * Output channels:
 * - log stream (stdout/stderr)
 * - error
 * - output (b/c it gets assigned to the _i variables, etc.). I think there
 *   ought to be only one of these
 * - display (out of band displayage)
 */
function make_outputs(outputs, store) {
  if (!outputs || !outputs.length) return
  var org = organizeOutputs(outputs)
  var items = []
  if (org.streams.stdout) {
    items.push(<div key='stdout'
      className='m_IPython_output m_IPython_output-stdout'>
        {ansiHtml(org.streams.stdout)}</div>)
  }

  if (org.streams.stderr) {
    items.push(<div key='stderr'
      className='m_IPython_output m_IPython_output-stderr'>
        {ansiHtml(org.streams.stderr)}</div>)
  }

  return items.concat(org.normal.map(showOutput.bind(null, store)))
}

function organizeOutputs(outputs) {
  var streams = {
    stdout: null,
    stderr: null,
  }
  var normal = []
  outputs.forEach((output, i) => {
    if (output.type !== 'stream') {
      if (output.suppressable && i !== outputs.length - 1) {
        return
      }
      return normal.push(output)
    }
    if (streams[output.stream]) {
      streams[output.stream] += output.text
    } else {
      streams[output.stream] = output.text
    }
  })
  return {streams: streams, normal: normal}
}

function formatTraceback(traceback, ansi) {
  if (!traceback) return
  if (ansi) return ansiHtml(traceback.join(''))
  return traceback
}

function escape(text) {
  return text ?
    text.replace('&', '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;') : 'null'
}

function ansiHtml(text) {
  return <pre dangerouslySetInnerHTML={{
    __html: convert.toHtml(escape(text))
  }}/>
}

function showOutput(store, output, i) {
  if (output.type === 'error') {
    return <div className='m_IPython_output m_IPython_output-error' key={i}>
      <div className='m_IPython_error_trace'>
        {formatTraceback(output.traceback, output.format === 'ansi')}
      </div>
    </div>
  }

  return format.display(i, output, store)
}

