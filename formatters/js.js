
var React = require('react')
  , isComplex = require('./is-complex')
  , getAllProperties = require('./get-all-properties')
  , uuid = require('../lib/uuid')

var _objs = {}

module.exports = {
  mime: 'js/obj',

  format: function (obj) {
    if (isComplex(obj, [], window)) {
      var id = uuid()
      _objs[id] = obj
      return id
    }
  },

  display: function (id) {
    if (!_objs[id]) return false
    return <ObjViewer value={_objs[id]}/>
  },
}

function viewValue(value) {
  if (value && 'object' === typeof value) return ObjViewer({value: value})
  try {
    return JSON.stringify(value, null, 2) || value + ''
  } catch (e) { }
  try {
    return value + ''
  } catch (e) { }
  return 'Undisplayable'
}

function objName(val) {
  return Array.isArray(val) ? 'Array' : (val.constructor ? val.constructor.name : 'Object')
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
      <div className='ObjViewer_head' onClick={this._onToggle}>
        <span className='ObjViewer_name'>{objName(val)}</span>
        {!this.state.open && summary(val)}
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

function summary(obj) {
  var names = Object.getOwnPropertyNames(obj)
  return <span className='ObjViewer_smallprops'>
    {' { '}
    {names.slice(0, 5).map(name => name + ': ' + small(obj[name])).join(', ')}
    {names.length > 5 && '...'}
    {' }'}
  </span>
}

function small(val) {
  if ('number' === typeof val) return '' + val
  if ('function' === typeof val)
    return (val.name || 'fn') + '(){...}'
  if (Array.isArray(val)) {
    var text = val.map(e => e + '').join(', ')
    if (text.length < 20) return '[' + text + ']'
    return '[..]'
  }
  if (!val) return val + ''
  if ('string' === typeof val) {
    return JSON.stringify(val.slice(0, 20) + (val.length > 20 ? '...' : ''))
  }
  if ('object' === typeof val && val.constructor) {
    return val.constructor.name
  }
  return 'unknown type'
}


