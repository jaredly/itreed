
module.exports = isComplex

function isComplex(value, path) {
  if (path.indexOf(value) !== -1) return true
  var npath = path.concat([value])
  if (Array.isArray(value)) {
    return value.some(sub => isComplex(sub, npath))
  }

  if ('function' === typeof value) return false
  if ('object' === typeof value && value) {
    if (Object.getPrototypeOf(Object.getPrototypeOf(value))) {
      return true
    }
    return getAllProperties(value).some(key => isComplex(value[key], npath))
  }

  return false
}

function getAllProperties(obj){
    var allProps = []
      , curr = obj
    do {
        var props = Object.getOwnPropertyNames(curr)
        props.forEach(function(prop){
            if (allProps.indexOf(prop) === -1)
                allProps.push(prop)
        })
    } while((curr = Object.getPrototypeOf(curr)) && Object.getPrototypeOf(curr))
    return allProps
}
