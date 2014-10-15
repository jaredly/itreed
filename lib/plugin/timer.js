
module.exports = showTimes

function showTimes(node, kernelSession) {
  var thisSession = kernelSession === node.session
  if (!node.started || (!node.finished && !thisSession))
    return // not evaluated this 'session'
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

