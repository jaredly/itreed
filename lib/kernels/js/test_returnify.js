
var esprima = require('esprima')
  , escodegen = require('escodegen')
  , returnify = require('./returnify')

var fixes = [
  ['var x', 'var x;'],
  ['x = 2', 'return x = 2;'],
  ['party()', 'return party();'],
  ['x = 2;log(x)', 'x = 2;\nreturn log(x);'],
]

fixes.forEach(function (fix) {
  var tree = esprima.parse(fix[0])
  returnify(tree)
  var res = escodegen.generate(tree)
  if (res !== fix[1]) {
    //console.log(JSON.stringify(tree, null, 2))
    console.error('Expected', JSON.stringify(fix[1]), ' but got ', JSON.stringify(res))
  } else {
    console.log('Passed')
  }
})

console.log('Done')
