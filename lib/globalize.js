/**
 * Transform some code so that there are no toplevel "var" statements
 */

var escoped = require('./escoped')

module.exports = function (tree) {
  var vard = []
  escoped.walk(tree, function (item, parent, attr, path) {
    if (item.type !== 'VariableDeclaration') return
    parent.splice(attr, 1)
    var news = []
    item.declarations.forEach(function (node) {
      // console.log(
      if (node.type !== 'VariableDeclarator') return
      vard.push(node.id)
      if (!node.init) return
      news.push({
        type: 'ExpressionStatement',
        expression: {
          type: 'AssignmentExpression',
          operator: '=',
          left: {
            type: 'MemberExpression',
            computed: false,
            object: {type: 'Identifier', name: 'global'},
            property: node.id,
          },
          right: node.init,
        }
      })
    })
    parent.splice.apply(parent, [attr, 0].concat(news))
  })
  tree.body.splice.apply(tree.body, [0, 0].concat(
    vard.map(function (id) {
      return {
        type: 'ExpressionStatement',
        expression: {
          type: 'AssignmentExpression',
          operator: '=',
          left: {
            type: 'MemberExpression',
            computed: false,
            object: {type: 'Identifier', name: 'global'},
            property: id,
          },
          right: {
            type: 'Identifier',
            name: 'undefined'
          },
        },
      }
    })
  ))
}

