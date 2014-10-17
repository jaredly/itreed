/**
 * Transform some code so that there are no toplevel "var" statements
 */

var escoped = require('./escoped')

module.exports = function (tree) {
  var vard = []
  var funcd = []

  var handlers = {
    VariableDeclaration: function (item, parent, attr) {
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
            left: node.id,
            right: node.init,
          }
        })
      })
      parent.splice.apply(parent, [attr, 0].concat(news))
    },
    /*
    FunctionDeclaration: function (item, parent, attr) {
      parent.splice(attr, 1)
      funcd.push({
        type: 'ExpressionStatement',
        expression: {
          type: 'AssignmentExpression',
          operator: '=',
          left: item.id,
          right: 
        },
      })
    },
    */
  }

  escoped.walk(tree, function (item, parent, attr, path) {
    if (!handlers[item.type]) return
    handlers[item.type](item, parent, attr)
  })
  tree.body.splice.apply(tree.body, [0, 0].concat(
    vard.map(function (id) {
      return {
        type: 'ExpressionStatement',
        expression: {
          type: 'AssignmentExpression',
          operator: '=',
          left: id,
          right: {
            type: 'Identifier',
            name: 'undefined'
          },
        },
      }
    })
  ))
}

