
var esprima = require('esprima')
  , escodegen = require('escodegen')
  , globalize = require('./globalize')

var fixes = [
  ['var x', 'x = undefined;'],
  ['var x;q = undefined', 'x = undefined;\nq = undefined;'],
  ['var x = 23', 'x = undefined;\nx = 23;'],
  ['3;var x = 23;4', 'x = undefined;\n3;\nx = 23;\n4;'],
  ['3;var x = 23, y, z = 10;4', 'x = undefined;\ny = undefined;\nz = undefined;\n3;\nx = 23;\nz = 10;\n4;'],
]

fixes.forEach(function (fix) {
  var tree = esprima.parse(fix[0])
  globalize(tree)
  var res = escodegen.generate(tree)
  if (res !== fix[1]) {
    //console.log(JSON.stringify(tree, null, 2))
    console.error('Expected', JSON.stringify(fix[1]), ' but got ', JSON.stringify(res))
  }
})

console.log('Done')
