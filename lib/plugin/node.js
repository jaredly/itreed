
var React = require('treed/node_modules/react/addons')
  , cx = React.addons.classSet

  , Convert = require('ansi-to-html')
  , convert = new Convert()

  , katex = require('katex')
  , moment = require('moment')
  , hljs = require('highlight.js')

  , CodeEditor = require('./code-editor')

var marked = require('marked')

var renderer = new marked.Renderer()
renderer.link = function (href, title, text) {
  return '<a href="' + href + '" target="_blank" title="' + title + '">' + text + '</a>';
}

var _hl_cache = {}
var markedOptions = {
  gfm: true,
  sanitize: true,
  tables: true,
  breaks: true,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: true,
  renderer: renderer,
  highlight: function (code, lang) {
    if (code in _hl_cache) {
      return _hl_cache[code]
    }
    try {
      var result = hljs.highlight('python', code).value;
      _hl_cache[code] = result
      return result
    } catch (ex) {
      _hl_cache[code] = undefined
    }
  }
}

function formatTraceback(traceback) {
  if (!traceback) return
  return plainHtml(traceback.join(''))
}

function escape(text) {
  return text ?
    text.replace('&', '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;') : 'null'
}

function plainHtml(text) {
  return <pre dangerouslySetInnerHTML={{
    __html: convert.toHtml(escape(text))
  }}/>
}

var VegaViewer = React.createClass({
  componentDidMount: function () {
    var node = this.getDOMNode()
    vg.parse.spec(this.props.data, (chart) => {
      chart({
        el: node, data: this.props.data.data.values,
        renderer: 'svg',
      }).update();
    })
  },
  render: function () {
    return <div className='m_IPython_output m_IPython_output-vega'/>
  }
})

function makeGorilla(data, nextid) {
  var rich = {}
  nextid = nextid || 0
  if (data.type === 'vega') {
    var id = (nextid++)
    rich[id] = data
    return ['<span class="rich-' + id + '"></span>', nextid, rich]
  }
  if (data.type === 'html') {
    return [data.content, nextid, {}]
  }
  if (data.type !== 'list-like') {
    return [escape(data.value), nextid, {}]
  }

  var items = data.items.map((item) => {
    var data = makeGorilla(item, nextid)
    nextid = data[1]
    for (var id in data[2]) {
      rich[id] = data[2][id]
    }
    return data[0]
  })
  var html = data.open + items.join(data.separator) + data.close
  return [html, nextid, rich]
}

function renderVega(data, node) {
  vg.parse.spec(data, (chart) => {
    chart({
      el: node,
      renderer: 'svg',
    }).update();
  })
}

var LatexViewer = React.createClass({
  componentDidMount: function () {
    katex.process(this.props.data, this.getDOMNode())
  },
  render: function () {
    return <div className='m_IPython_output m_IPython_output-latex'/>
  }
})

var ListLikeViewer = React.createClass({
  componentDidMount: function () {
    this.doThings(this.props.data)
  },
  doThings: function (data) {
    var parts = makeGorilla(data, 0)
    var node = this.getDOMNode()
    node.innerHTML = parts[0]
    var rich = parts[2]
    for (var id in rich) {
      var dest = node.getElementsByClassName('rich-' + id)[0]
      var renderer = {
        vega: renderVega
      }[rich[id].type]
      if (!renderer) {
        console.warn('skipping the render of', rich[id].type, rich[id])
        continue;
      }
      renderer(rich[id].content, dest)
    }
  },
  render: function () {
    return <div className='m_IPython_output m_IPython_output-list-like'/>
  }
})

function showOutput(output, i) {
  if (output.output_type === 'pyerr') {
    return <div className='m_IPython_output m_IPython_output-error' key={i}>
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
  if (output['json/vega']) {
    return <VegaViewer data={output['json/vega']}/>
  }
  if (output['json/list-like']) {
    return ListLikeViewer({data: output['json/list-like']})
  }
  /*
  if (output['json/latex']) {
    return <LatexViewer data={output['json/latex'].content}/>
  }
  if (output['text/latex']) {
    return <LatexViewer data={output['text/latex']}/>
  }
  */
  if (output['text/html']) {
    return <div className='m_IPython_output m_IPython_output-html' key={i}
      dangerouslySetInnerHTML={{__html: output['text/html']}}/>
  }
  if (output['image/png']) {
    return <img className='m_IPython_output m_IPython_output-png' key={i} src={'data:image/png;base64,' + output['image/png']}/>
  }
  return <div className='m_IPython_output m_IPython_output-plain' key={i}>
    {plainHtml(output['text/plain'])}
  </div>
}

function make_outputs(outputs) {
  if (!outputs || !outputs.length) return
  var streams = {
    stdout: null,
    stderr: null,
  }
  var normal = []
  // aggregate streams
  outputs.forEach((output, i) => {
    if (output.output_type !== 'stream') {
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
  var items = []
  if (streams.stdout) {
    items.push(<div key='stdout'
      className='m_IPython_output m_IPython_output-stdout'>
        {plainHtml(streams.stdout)}</div>)
  }
  if (streams.stderr) {
    items.push(<div key='stderr'
      className='m_IPython_output m_IPython_output-stderr'>
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

function showTimes(node, kernelSession) {
  var thisSession = kernelSession === node.session
  if (!node.started || (!node.finished && !thisSession)) return // not evaluated this 'session'
  if (!node.finished) {
    return <CountingTimer
      time={node.started}
      className='m_IPython_time m_IPython_time-loading'/>
  }
  var duration = node.finished - node.started
  var className = 'm_IPython_time' + (thisSession ? '' : ' m_IPython_time-stale')
  return <div className={className}>
    {!thisSession && <em>stale </em>}
    {moment(node.finished).format('h:mm:ss\\\\a')}
    <br/>
    {moment(duration).format('mm:ss.SSS\\s')}
  </div>
}

module.exports = {
  classes: function (node, state) {
    if (node.type !== 'ipython') return
    return cx({
      'list_item-ipython-disabled': !state.kernelSession,
      'list_item-ipython-collapsed': node.display_collapsed,
      'list_item-ipython-stale': state.kernelSession !== node.session,
      'list_item-ipython-running': node.started && !node.finished,
      'list_item-ipython-dirty': node.executed !== node.content,
    })
  },

  blocks: {
    belowbody: function (node, actions, state) {
      if (node.type !== 'ipython') return
      // TODO: indicate node.language somewhere
      var className = cx({
        'm_IPython': true,
        'm_IPython-hiding': node.display_collapsed,
        'm_IPython-empty': !(node.output && node.output.length),
      })
      return <div className={className} ref='ipython_view' onClick={actions.setActive.bind(actions, node.id)}>
        {make_outputs(node.outputs)}
        {node.loading && <div className='m_IPython_loading'><div>Loading</div></div>}
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
      editor: CodeEditor,
    }
  },

  listener: {
    changes: ['kernel-session'],
    updateStoreState: function (state, getters) {
      return {kernelSession: getters.kernelSession()}
    },
  },
}

