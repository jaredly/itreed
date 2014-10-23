
var React = require('treed/node_modules/react')
  , safeString = require('../../kernels/js/safe-string')

var handlers = {
  default_mime: {
    'text/html': value => 
      <div className='m_IPython_output_html'
        dangerouslySetInnerHTML={{
          __html: 'DEPRECATE text/html;' + value
        }}/>,
    'image/png': value =>
      <img className='m_IPython_output_png'
        src={'data:image/png;base64,' + value}/>,
    'text/plain': value =>
      <div className='m_IPython_output_plain'>
        {value}
      </div>,
  },
  formatters: [],
  mime: {
  }
}

module.exports = {
  display: display,
  format: format,
  handlers: handlers,
  displayer: displayer,
  formatter: formatter,
}

function display(value, meta) {
  for (var name in handlers.mime) {
    if (value[name]) {
      return handlers.mime[name](value[name], meta)
    }
  }
  for (var name in handlers.default_mime) {
    if (value[name]) {
      return handlers.default_mime[name](value[name], meta)
    }
  }
  return <em>Unknown mime type</em>
}

function format(value) {
  var result = {
    'text/plain': safeString(value),
  }
  handlers.formatters.some(fm => {
    var res = fm[0](value)
    if (res === undefined) return false
    result[fm[1]] = res
    return true
  })
  return result
}

function displayer(handler, mime) {
  handlers.mime[mime] = handler
}

function formatter(handler, mime) {
  handlers.formatters.push([handler, mime])
}

