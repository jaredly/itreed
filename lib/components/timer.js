
var React = require('react/addons')

module.exports = showTimes

function mmss(time) {
  const d = new Date(time)
  let s = d.getSeconds()
  if (s < 10) s = '0' + s
  return d.getMinutes() + ':' + s + 's'
}

function mmssSSS(time) {
  const d = new Date(time)
  let s = d.getSeconds()
  let ms = d.getMilliseconds()
  if (s < 10) s = '0' + s
  if (ms < 10) ms = '00' + ms
  else if (ms < 100) ms = '0' + ms
  return d.getMinutes() + ':' + s + '.' + ms + 's'
}

function hmmssa(time) {
  const d = new Date(time)
  let m = d.getMinutes()
  if (m < 10) m = '0' + m
  let s = d.getSeconds()
  if (s < 10) s = '0' + s
  const a = d.getHours() > 11 ? 'pm' : 'am'
  let h = d.getHours()
  if (h > 12) h -= 12
  return `${h}:${m}:${s}${a}`
}

function showKernelName(node, kernelName, singleKernel) {
  const key = node.itreed.server + '.' + node.itreed.kernel + '.' + (node.itreed.variant || 'default')
  if (!kernelName) {
    return <span className='KernelName KernelName-error'>
      Kernel {key} is not configured`
    </span>
  }
  if (singleKernel) return null
  return <span className={'KernelName KernelName-' + key.replace(/[\.\s]/g, '-')}>
    {kernelName}
  </span>
}

function showTimes(node, kernelSession, kernelName, singleKernel) {
  var thisSession = kernelSession === node.session
  var className = 'm_IPython_time' + (thisSession ? '' : ' m_IPython_time-stale')
  const kernelNameNode = showKernelName(node, kernelName, singleKernel)
  if (!node.started || (!node.finished && !thisSession)) {
    return <div className={className}>
      {kernelNameNode}
    </div>
  }

  if (!node.finished) {
    return <div className={className}>
      {kernelNameNode}
      <CountingTimer
        time={node.started}
        className='m_IPython_time m_IPython_time-loading'/>
    </div>
  }
  var duration = node.finished - node.started
  return <div className={className}>
    {kernelNameNode}
    {!thisSession && <em>stale </em>}
    {hmmssa(node.finished)}
    <br/>
    {mmssSSS(duration)}
  </div>
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
    return <div {...this.props}>{
      mmss(this.state.duration)
    }</div>
  }
})

