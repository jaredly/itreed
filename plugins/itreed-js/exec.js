
var jsx = require('./jsx')
  , makeOutput = require('./make-output')


const NODE = typeof window === 'undefined'

module.exports = execute

function outError(e) {
  return {
    type: 'error',
    name: e.name,
    message: e.message,
    traceback: e.stack
  }
}

function goAndDo(content, ctx, callbacks, local) {
  ctx._wwEval(
    local ? ctx.lworker : ctx.worker,
    callbacks.output,
    content,
    (result) => {
      callbacks.output(makeOutput(result, ctx))
      callbacks.end()
    },
    () => {
      callbacks.end()
    }
  )
}

function injectCSS(content, ctx) {
  var div = document.createElement('div')
  div.innerHTML = '<style>' + content + '</style>'
  div.firstChild.className = 'injected-magic'
  ctx.document.head.appendChild(div.firstChild)
}

function execute(content, evt, ctx, callbacks) {
  var num = ctx._ih.length
  ctx._ih.push(content)
  callbacks.start()

  var firstLine = content.split('\n', 1)[0]
  if (firstLine.slice(0,2) === '%%') {
    var magic = firstLine.slice(2).trim().toLowerCase()
    if (magic === 'work' || magic === 'ww') {
      return goAndDo(content.slice(firstLine.length + 1), ctx, callbacks)
    } else if (magic === 'lwork' || magic === 'lww') {
      return goAndDo(content.slice(firstLine.length + 1), ctx, callbacks, true)
    } else if (magic === 'jsx') {
      // pass, ignore
      content = content.slice(firstLine.length + 1)
    } else if (magic === 'css') {
      ctx.addInjectCSS(content.slice(firstLine.length + 1))
      // injectCSS(content.slice(firstLine.length + 1), ctx)
      callbacks.end()
      return
    } else if (magic === 'html') {
      callbacks.output(makeOutput(content.slice(firstLine.length + 1), ctx, 'text/html'))
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
    var body = preprocess(content, ctx, callbacks, num)
  } catch (e) {
    callbacks.output(outError(e))
    callbacks.end()
    return
  }
  */

  ctx._output = callbacks.output.bind(callbacks)
  ctx.display = (what, mime) => callbacks.output(makeOutput(what, ctx, mime)),
  ctx.console = {
    log: function () {
      callbacks.output({
        type: 'output',
        suppressable: false,
        'json/log': [].map.call(arguments, arg => makeOutput(arg, ctx)),
      })
    }
  }

  let res
  try {
    if (NODE) {
      res = vm.runInContext(body, ctx, {filename: 'itreed-kernel'})
    } else {
      res = ctx.eval(body)
    }
  } catch (e) {
    callbacks.output(outError(e))
    callbacks.end()
    return
  }

  // update the magic vars
  if (undefined !== res) {
    ctx._oh[num] = res
    ctx.___ = ctx.__
    ctx.__ = ctx._
    ctx._ = res
    callbacks.output(makeOutput(res, ctx))
  }

  callbacks.end()
}

/*
function inject(tree, ctx, suffix, injecting) {
  var replace = {}
  for (var name in injecting) {
    replace[name] = name + suffix
  }
  var needed = uniquity(tree, replace)
  needed.forEach(name => {
    ctx[replace[name]] = injecting[name]
  })
}

function preprocess(content, ctx, callbacks, num) {
  var tree = esprima.parse(content)

  inject(tree, ctx, '$' + num, {
    lwork: ctx._work.bind(null, ctx.lworker, callbacks.output),
    lwwEval: ctx._wwEval.bind(null, ctx.lworker, callbacks.output),

    work: ctx._work.bind(null, ctx.worker, callbacks.output),
    wwEval: ctx._wwEval.bind(null, ctx.worker, callbacks.output),

    loadJS: ctx._loadJS.bind(null, ctx, callbacks.output),
    loadParentJS: ctx._loadJS.bind(null, ctx.parent, callbacks.output),
    loadCSS: ctx._loadCSS.bind(null, ctx, callbacks.output),
    loadParentCSS: ctx._loadCSS.bind(null, ctx.parent, callbacks.output),

    display$: (what, mime) => callbacks.output(makeOutput(what, ctx, mime)),
    console$: {
      log: function () {
        callbacks.output(makeOutput([].slice.call(arguments), ctx))
      }
    }
  })

  return escodegen.generate(tree)
}
*/

