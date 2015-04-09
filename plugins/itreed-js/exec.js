
var// esprima = require('esprima')
  // , escodegen = require('escodegen')
  jsx = require('./jsx')

  // , uniquity = require('./uniquity')
  , makeOutput = require('./make-output')

module.exports = execute

function outError(e) {
  return {
    type: 'error',
    name: e.name,
    message: e.message,
    traceback: e.stack
  }
}

function goAndDo(content, window, callbacks, local) {
  window._wwEval(
    local ? window.lworker : window.worker,
    callbacks.output,
    content,
    (result) => {
      callbacks.output(makeOutput(result, window))
      callbacks.end()
    },
    () => {
      callbacks.end()
    }
  )
}

function injectCSS(content, window) {
  var div = document.createElement('div')
  div.innerHTML = '<style>' + content + '</style>'
  div.firstChild.className = 'injected-magic'
  window.document.head.appendChild(div.firstChild)
}

function execute(content, window, callbacks) {
  var num = window._ih.length
  window._ih.push(content)
  callbacks.start()

  var firstLine = content.split('\n', 1)[0]
  if (firstLine.slice(0,2) === '%%') {
    var magic = firstLine.slice(2).trim().toLowerCase()
    if (magic === 'work' || magic === 'ww') {
      return goAndDo(content.slice(firstLine.length + 1), window, callbacks)
    } else if (magic === 'lwork' || magic === 'lww') {
      return goAndDo(content.slice(firstLine.length + 1), window, callbacks, true)
    } else if (magic === 'jsx') {
      // pass, ignore
      content = content.slice(firstLine.length + 1)
    } else if (magic === 'css') {
      window.addInjectCSS(content.slice(firstLine.length + 1))
      // injectCSS(content.slice(firstLine.length + 1), window)
      callbacks.end()
      return
    } else if (magic === 'html') {
      callbacks.output(makeOutput(content.slice(firstLine.length + 1), window, 'text/html'))
      callbacks.end()
      return
    } else {
      callbacks.output({
        type: 'error',
        name: 'SyntaxError',
        message: 'Invalid magic: ' + magic,
        traceback: 'Invalid magic: ' + magic,
      })
      callbacks.end()
      return
    }
  }

  try {
    content = jsx(content)
  } catch (e) {
    callbacks.output(outError(e))
    callbacks.end()
    return
  }

  const body = content

  /*
  try {
    var body = preprocess(content, window, callbacks, num)
  } catch (e) {
    callbacks.output(outError(e))
    callbacks.end()
    return
  }
  */

  window._output = callbacks.output.bind(callbacks)
  window.display = (what, mime) => callbacks.output(makeOutput(what, window, mime)),
  window.console = {
    log: function () {
      callbacks.output({
        type: 'output',
        suppressable: false,
        'json/log': [].map.call(arguments, arg => makeOutput(arg, window)),
      })
    }
  }

  try {
    var res = window.eval(body)
  } catch (e) {
    callbacks.output(outError(e))
    callbacks.end()
    return
  }

  // update the magic vars
  if (undefined !== res) {
    window._oh[num] = res
    window.___ = window.__
    window.__ = window._
    window._ = res
    callbacks.output(makeOutput(res, window))
  }

  callbacks.end()
}

/*
function inject(tree, window, suffix, injecting) {
  var replace = {}
  for (var name in injecting) {
    replace[name] = name + suffix
  }
  var needed = uniquity(tree, replace)
  needed.forEach(name => {
    window[replace[name]] = injecting[name]
  })
}

function preprocess(content, window, callbacks, num) {
  var tree = esprima.parse(content)

  inject(tree, window, '$' + num, {
    lwork: window._work.bind(null, window.lworker, callbacks.output),
    lwwEval: window._wwEval.bind(null, window.lworker, callbacks.output),

    work: window._work.bind(null, window.worker, callbacks.output),
    wwEval: window._wwEval.bind(null, window.worker, callbacks.output),

    loadJS: window._loadJS.bind(null, window, callbacks.output),
    loadParentJS: window._loadJS.bind(null, window.parent, callbacks.output),
    loadCSS: window._loadCSS.bind(null, window, callbacks.output),
    loadParentCSS: window._loadCSS.bind(null, window.parent, callbacks.output),

    display$: (what, mime) => callbacks.output(makeOutput(what, window, mime)),
    console$: {
      log: function () {
        callbacks.output(makeOutput([].slice.call(arguments), window))
      }
    }
  })

  return escodegen.generate(tree)
}
*/

