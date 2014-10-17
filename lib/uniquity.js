
var escoped = require('./escoped')

module.exports = function (tree, map) {
  var scope = escoped(tree)
  changeCheck(scope, map, tree)
}

function changeCheck(scope, map, root) {

  var mymap = {}
  for (var name in map) {
    if (scope.declared.indexOf(name) !== -1) continue
    mymap[name] = map[name]
    scope.used.forEach(function (used) {
      var alt = mymap[used.name]
      if (!alt) return
      // var parent = used.path.slice(0, -1).reduce((obj, attr) => obj[attr], root)
      // var node = parent[used.path[used.path.length - 1]]
      used.path.reduce(function (obj, attr) { return obj[attr] }, root).name = alt
    })
  }

  var used = scope.children.reduce(function (used, child) {
    return used.concat(changeCheck(child, mymap, root))
  }, [])
  if (used.length) return used

  return []
}

