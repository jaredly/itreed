
var React = require('treed/node_modules/react')
var Convert = require('ansi-to-html')
  , convert = new Convert()
  , moment = require('moment')

function formatTraceback(traceback) {
  if (!traceback) return
  return plainHtml(traceback.join(''))
}

function escape(text) {
  return text.replace('&', '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
}

function plainHtml(text) {
  return <pre dangerouslySetInnerHTML={{
    __html: convert.toHtml(escape(text))
  }}/>
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
    items.push(<div key='stdout'
      className='m_IPython_stream m_IPython_stream-stdout'>
        {plainHtml(streams.stdout)}</div>)
  }
  if (streams.stderr) {
    items.push(<div key='stderr'
      className='m_IPython_stream m_IPython_stream-stderr'>
        {plainHtml(streams.stderr)}</div>)
  }

  return items.concat(normal.map(showOutput))
}

var CountingTimer = React.createClass({
  getInitialState: function () {
    return {
      duration: Date.now() - this.props.time
    }
  },
  componentDidMount: function () {
    this._interval = setInterval(() => {
      this.setState({duration: Date.now() - this.props.time})
    }, 200);
  },
  componentWillUnmount: function () {
    clearInterval(this._interval)
  },
  render: function () {
    return this.transferPropsTo(<div>{
      moment(this.state.duration).format('mm:ss\\s')
    }</div>)
  }
})

function showTimes(node) {
  if (!node.started) return // not evaluated this 'session'
  if (!node.finished) {
    return <CountingTimer time={node.started} className='m_IPython_time m_IPython_time-loading'/>
  }
  var duration = node.finished - node.started
  return <div className='m_IPython_time'>
    {moment(node.finished).format('h:mm:ss\\\\a')}<br/>
    {moment(duration).format('mm:ss\\s')}
  </div>
}

module.exports = {
  blocks: {
    prechildren: function (node, actions, state) {
      if (node.type !== 'ipython') return
      // TODO: indicate node.language somewhere
      if (!node.loading && (!node.outputs || !node.outputs.length)) return
      return <div className='m_IPython'>
        {make_outputs(node.outputs)}
        {node.loading && <div className='m_IPython_loading'><div>Loading</div></div>}
        {showTimes(node)}
        {/*
        <pre>{JSON.stringify(node.outputs, null, 2)}</pre>
        */}
      </div>
    }
  }
}

