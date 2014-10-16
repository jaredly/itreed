
var uuid = require('./uuid')
  , React = require('treed/node_modules/react')
  , isComplex = require('./is-complex')

var _objs = {}

module.exports = {
  register: function (obj) {
    var id = uuid()
    _objs[id] = obj
    return id
  },
  render: function (id) {
    if (!_objs[id]) return false
    return <ObjViewer value={_objs[id]}/>
  },
}

function viewValue(value) {
  if (isComplex(value, [])) return ObjViewer({value: value})
  return JSON.stringify(value, null, 2) || value + ''
}

var ObjViewer = React.createClass({
  getInitialState: function () {
    return {
      open: false
    }
  },
  _onToggle: function () {
    this.setState({open: !this.state.open})
  },
  render: function () {
    var val = this.props.value
    return <div className='ObjViewer'>
      <div className='ObjViewer_name' onClick={this._onToggle}>
        {val.constructor.name}
      </div>
      {this.state.open &&
        <table className='ObjViewer_props'>
          <tbody>
            {getAllProperties(val).sort().map(name =>
              <tr className='ObjViewer_prop'>
                <td className='ObjViewer_attr'>{name}</td>
                <td className='ObjViewer_val'>
                  {viewValue(val[name])}
                </td>
              </tr>)}
          </tbody>
        </table>}
    </div>
  },
})


function getAllProperties(obj){
    var allProps = []
      , curr = obj
    do{
        var props = Object.getOwnPropertyNames(curr)
        props.forEach(function(prop){
            if (allProps.indexOf(prop) === -1)
                allProps.push(prop)
        })
    }while(curr = Object.getPrototypeOf(curr))
    return allProps
}
