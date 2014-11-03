
module.exports = getAllProperties

function getAllProperties(obj){
  var allProps = []
    , curr = obj

  if (Array.isArray(obj)) {
    for (var i=0; i<obj.length; i++) {
      allProps.push(i)
    }
    allProps.push('length')
    return allProps
  }

  do {
    var props = Object.getOwnPropertyNames(curr)
    props.forEach(function(prop){
      if (allProps.indexOf(prop) === -1)
        allProps.push(prop)
    })
  } while((curr = Object.getPrototypeOf(curr)) &&
          Object.getPrototypeOf(curr))

  return allProps
}
