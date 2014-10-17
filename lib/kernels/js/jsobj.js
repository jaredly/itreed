
var uuid = require('../../uuid')
  , React = require('treed/node_modules/react')
  , isComplex = require('./is-complex')
  , getAllProperties = require('./get-all-properties')

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
  try {
    return JSON.stringify(value, null, 2) || value + ''
  } catch (e) { }
  try {
    return value + ''
  } catch (e) { }
  return 'Undisplayable'
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
        {Array.isArray(val) ? 'Array' : val.constructor.name}
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
  if ('object' === typeof val) {
    return val.constructor.name
  }
  return '...'
}

