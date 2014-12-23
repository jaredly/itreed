
var React = require('treed/node_modules/react')
  , safeString = require('../../kernels/js/safe-string')
  , Convert = require('ansi-to-html')
  , convert = new Convert()

var handlers = {
  default_mime: {
    'json/link': value =>
      <a href={value.href || value} title={value.title} target='_blank'>{value.text || value}</a>,
    'text/html': value => 
      <div className='m_IPython_output_html'
        dangerouslySetInnerHTML={{
          __html: /*'DEPRECATE text/html;' + */value
        }}/>,
    'json/log': (value, store) =>
      <ul className='m_IPython_output_log' style={{padding: 0, margin: 0, 'list-style': 'none'}}>
        {value.map(item =>
          <li style={{display: 'inline-block', padding: '0 5px'}}>{display(item, store)}</li>
        )}
      </ul>,
    'json/figure': value =>
      <div style={{textAlign: 'center', display: 'inline-block'}}>
        <img src={value.src}/>
        <div style={{textAlign: 'center'}}>{value.title}</div>
      </div>,
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

function display(key, value, store, meta) {
  for (var name in handlers.mime) {
    if (value[name]) {
      var res = handlers.mime[name](value[name], store, meta)
      return <div className={
        'm_IPython_output m_IPython_output-' + name.replace('/', '-')
      } key={key}>{res}</div>
    }
  }
  for (var name in handlers.default_mime) {
    if (value[name]) {
      var res = handlers.default_mime[name](value[name], store, meta)
      return <div className={
        'm_IPython_output m_IPython_output-' + name.replace('/', '-')
      } key={key}>{res}</div>
    }
  }
  return <div className='m_IPython_output' key={key}>
    <em>Unknown mime type</em>
  </div>
}

function format(value, window) {
  var result = {
    'text/plain': safeString(value),
  }
  handlers.formatters.some(fm => {
    var res = fm[0](value, window)
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

