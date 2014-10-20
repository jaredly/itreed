
var esprima = require('esprima')
  , escodegen = require('escodegen')

  , uniquity = require('./uniquity')
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

function goAndDo(content, window, callbacks) {
  window._wwEval(
    callbacks.output,
    content,
    (result) => {
      callbacks.output(makeOutput(result))
      callbacks.end()
    },
    () => {
      callbacks.end()
    }
  )
}

function execute(content, window, callbacks) {
  var num = window._ih.length
  window._ih.push(content)
  callbacks.start()

  var firstLine = content.split('\n', 1)[0]
  if (firstLine.slice(0,2) === '%%') {
    var magic = firstLine.slice(2).trim()
    if (magic === 'work' || magic === 'ww') {
      return goAndDo(content.slice(firstLine.length + 1), window, callbacks)
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

  var body = preprocess(content, window, callbacks, num)

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
  }
  callbacks.output(makeOutput(res))

  callbacks.end()
}

function inject(tree, window, suffix, injecting) {
  var replace = {}
  for (var name in injecting) {
    replace[name] = '_' + name + suffix
  }
  var needed = uniquity(tree, replace)
  needed.forEach(name => {
    window[replace[name]] = injecting[name]
  })
}

function preprocess(content, window, callbacks, num) {
  var tree = esprima.parse(content)

  inject(tree, window, num, {
    work: window._work.bind(null, callbacks.output),
    wwEval: window._wwEval.bind(null, callbacks.output),
    display: (what, mime) => callbacks.output(makeOutput(what, mime)),
    console: {
      log: function () {
        callbacks.output(makeOutput([].slice.call(arguments)))
      }
    }
  })

  return escodegen.generate(tree)
}
