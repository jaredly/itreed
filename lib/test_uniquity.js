
var esprima = require('esprima')
  , escodegen = require('escodegen')
  , uniquity = require('./uniquity')

var fixes = [
  ['var x', {x: 'y'}, 'var x;'],
  ['x.x', {x: 'y'}, 'y.x;'],
  ['var x; x = 2;', {x: 'y'}, 'var x;\nx = 2;'],
  ['x = 2', {x: 'y'}, 'y = 2;'],
  ['dot(x)', {x: 'y'}, 'dot(y);'],
  ['function a() {x()}', {x: 'y'}, 'function a() {\n    y();\n}'],
  ['function a(x) {x()}', {x: 'y'}, 'function a(x) {\n    x();\n}'],
]

fixes.forEach(function (fix) {
  var tree = esprima.parse(fix[0])
  uniquity(tree, fix[1])
  var res = escodegen.generate(tree)
  if (res !== fix[2]) {
    //console.log(JSON.stringify(tree, null, 2))
    console.error('Expected',
                  JSON.stringify(fix[2]),
                  ' but got ',
                  JSON.stringify(res))
  } else {
    console.log('Passed')
  }
})

console.log('Done')
