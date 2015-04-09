
var TPLS = {
  bar: require('./bar.tpl.json'),
}

module.exports = {
  bar: bar,
}

function copy(thing) {
  if (Array.isArray(thing)) return thing.map(copy)
  if (!thing) return thing
  if ('object' !== typeof thing) return thing
  var clone = {}
  for (var name in thing) {
    clone[name] = copy(thing[name])
  }
  return clone
}

function bar(data, opts) {
  var tpl = copy(TPLS.bar)
  tpl.data = data.map((val, i) => ({
    idx: i,
    val: val,
    col: 'data'
  }))

  tpl.axes[0].title = opts.xtitle || ''
  tpl.axes[1].title = opts.ytitle || ''

  return tpl
}

