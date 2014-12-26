
var React = require('treed/node_modules/react/addons')
  , cx = React.addons.classSet
  , PT = React.PropTypes

var Tabular = React.createClass({
  propTypes: {
    items: PT.array,
    headers: PT.object,
    onSelect: PT.func,
  },

  componentDidUpdate: function () {
    this.resizeHead()
  },

  componentDidMount: function () {
    this.resizeHead()
  },

  resizeHead: function () {
    // equalize the header sizes
    var table = this.refs.table.getDOMNode()
    var head = this.refs.head.getDOMNode()
      , ths = head.getElementsByTagName('th')
    ;[].map.call(table.getElementsByTagName('th'), (th, i) => {
      var cs = window.getComputedStyle(th)
      ths[i].style.width = cs.width
    })
  },

  render: function () {
    var heads = Object.keys(this.props.headers)
    return <div className='Tabular'>
      <table className='Tabular_header' ref='head'>
        <thead>
          <tr>
            {
              heads.map(name => <th>{name}</th>)
            }
          </tr>
        </thead>
        <tbody/>
      </table>
      <div className='Tabular_container'>
        <table className='Tabular_table' ref='table'>
          <thead>
            <tr>
              {
                heads.map(name => <th>{name}</th>)
              }
            </tr>
          </thead>
          <tbody>
            {
              this.props.items.map(item => <tr
                  onContextMenu={this.props.onMenu.bind(null, item)}
                  onClick={this.props.onSelect.bind(null, item)}>
                {heads.map(name => <td>{this.props.headers[name](item)}</td>)}
              </tr>)
            }
          </tbody>
        </table>
      </div>
    </div>
  },
})

module.exports = Tabular

