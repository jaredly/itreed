
var React = require('react')
  , Convert = require('ansi-to-html')
  , convert = new Convert()

function safeString(res) {
  if ('undefined' === typeof res) return 'undefined'
  if ('number' === typeof res && isNaN(res)) return 'NaN'
  try {
    return JSON.stringify(res, null, 2) || res + ''
  } catch (e) { }
  try {
    return res + ''
  } catch (e) { }
  return '<cannot display object>'
}

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
        {value.map((item, i) =>
          <li style={{display: 'inline-block', padding: '0 5px'}}>{display(i, item, store)}</li>
        )}
      </ul>,
    'json/figure': value =>
      <div style={{textAlign: 'center', display: 'inline-block'}}>
        <img src={value.src}/>
        <div style={{textAlign: 'center'}}>{value.title}</div>
      </div>,
    'image/png': (value, s, m, mdata) =>
      <img className='m_IPython_output_png'
        width={mdata && mdata.width}
        height={mdata && mdata.height}
        src={'data:image/png;base64,' + value}/>,
    'image/jpeg': (value, s, m, mdata) =>
      <img className='m_IPython_output_jpeg'
        width={mdata && mdata.width}
        height={mdata && mdata.height}
        src={'data:image/jpeg;base64,' + value}/>,
    'text/ansi': value =>
      <div className='m_IPython_output_ansi'
        dangerouslySetInnerHTML={{
          __html: convert.toHtml(escape(value))
        }}/>,
    'text/plain': value =>
      <div className='m_IPython_output_plain'>
        {value}
      </div>,
  },
  formatters: [],
  mime: {
  }
}

/*
function handleImage(fmt, value, store, meta, mdata) {
  let props = {
    src: value
  }
  if (mdata) {
    if (mdata.width) props.width = mdata.width
    if (mdata.height) props.height = mdata.height
  }
  let cls = 
}
*/

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
      var res = handlers.mime[name](value[name], store, meta, value.metadata && value.metadata[name])
      return <div className={
        'm_IPython_output m_IPython_output-' + name.replace('/', '-')
      } key={key}>{res}</div>
    }
  }
  for (var name in handlers.default_mime) {
    if (value[name]) {
      var res = handlers.default_mime[name](value[name], store, meta, value.metadata && value.metadata[name])
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

