
module.exports = extend

function extend(dest) {
  for (var i=1; i<arguments.length; i++) {
    for (var name in arguments[i]) {
      dest[name] = arguments[i][name]
    }
  }
  return dest
}

