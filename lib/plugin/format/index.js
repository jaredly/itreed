
var React = require('treed/node_modules/react')
  , safeString = require('../../kernels/js/safe-string')
var Convert = require('ansi-to-html')
  , convert = new Convert()

var handlers = {
  default_mime: {
    'json/link': value =>
      <a href={value.href || value} title={value.title} target='_blank'>{value.text || value}</a>,
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
    'text/ansi': value =>
      <div className='m_IPython_output_ansi'
        dangerouslySetInnerHTML={{
          __html: convert.toHtml(escape(value))
        }}/>,
  },
  formatters: [],
  mime: {
  }
}

function escape(text) {
  return text ?
    text.replace('&', '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;') : 'null'
}

module.exports = {
  display: display,
  format: format,
  handlers: handlers,
  displayer: displayer,
  formatter: formatter,
}

function display(value, store, meta) {
  for (var name in handlers.mime) {
    if (value[name]) {
      return handlers.mime[name](value[name], store, meta)
    }
  }
  for (var name in handlers.default_mime) {
    if (value[name]) {
      return handlers.default_mime[name](value[name], store, meta)
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
