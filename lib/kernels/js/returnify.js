/**
 * Change the last statement into a return statement.
 */

module.exports = function (tree) {
  var count = tree.body.length
    , last = tree.body[count-1]
  if (last.type !== 'ExpressionStatement') return

  tree.body[count-1] = {
    type: 'ReturnStatement',
    argument: last.expression
  }
}

