
module.exports = function (tree) {
  var tracker = newScope()

  crawlScope(tree, function (node, scope, parent, param, path) {
    var fn = crawls[node.type]
    if (fn) fn(node, scope, parent, param, path)
  }, tracker, newScope);

  return tracker
}

module.exports.walk = walkTopScope

function scopeName(node) {
  if (node.type === 'FunctionDeclaration') return node.id.name;
  return '<anon>'
}

function newScope(node, path) {
  return {
    path: path,
    name: node && scopeName(node),
    declared: node ? node.params.map(function (n) {return n.name}) : [],
    children: [],
    used: [],
  }
}

var needNewScope = {
  FunctionDeclaration: ['body'],
  FunctionExpression: ['body'],
}

function walkTopScope(tree, visitor, parent, parentParam, path) {
  var black = needNewScope[tree.type] || [];
  path = path || []
  visitor(tree, parent, parentParam, path)
  var thisScope
  for (var name in tree) {
    if (black.indexOf(name) !== -1) {
      continue
    }
    if (Array.isArray(tree[name])) {
      tree[name].map(function (item, i) {
        walkTopScope(item, visitor, tree[name], i, path.concat([name, i]))
      });
    } else if ('object' === typeof tree[name] &&
               tree[name] !== null &&
               tree[name].type) {
      walkTopScope(tree[name], visitor, tree, name, path.concat([name]))
    }
  }
}

function crawlScope(tree, visitor, scope, newScope, parent, parentParam, path) {
  var black = needNewScope[tree.type] || [];
    path = path || [];
  visitor(tree, scope, parent, parentParam, path)
  var thisScope
  for (var name in tree) {
    if (black.indexOf(name) !== -1) {
        thisScope = newScope(tree, path)
        scope.children.push(thisScope)
    } else {
        thisScope = scope
    }
    if (Array.isArray(tree[name])) {
      tree[name].map(function (item, i) {
        crawlScope(item, visitor, thisScope, newScope, tree, name, path.concat([name, i]))
      });
    } else if ('object' === typeof tree[name] && tree[name] !== null && tree[name].type) {
      crawlScope(tree[name], visitor, thisScope, newScope, tree, name, path.concat([name]));
    }
  }
}


