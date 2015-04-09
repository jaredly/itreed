
var escoped = require('./escoped')

module.exports = function (tree, map) {
  var scope = escoped(tree)
  return Object.keys(changeCheck(scope, map, tree))
}

function changeCheck(scope, map, root) {
  var using = {}

  var mymap = {}
  for (var name in map) {
    if (scope.declared.indexOf(name) !== -1) continue
    mymap[name] = map[name]
    scope.used.forEach(function (used) {
      var alt = mymap[used.name]
      if (!alt) return
      using[used.name] = true
      used.path.reduce(function (obj, attr) {
        return obj[attr]
      }, root).name = alt
    })
  }

  scope.children.forEach(function (child) {
    var chusing = changeCheck(child, mymap, root)
    for (var name in chusing) {
      using[name] = true
    }
  })

  return using
}

