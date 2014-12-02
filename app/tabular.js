
var React = require('treed/node_modules/react/addons')
  , cx = React.addons.classSet
  , PT = React.PropTypes

var Tabular = React.createClass({
  propTypes: {
    items: PT.array,
    headers: PT.object,
  },
  render: function () {
    var heads = Object.keys(this.props.headers)
    return <table>
      <thead>
        <tr>
          {
            heads.map(name => <th>{name}</th>)
          }
        </tr>
      </thead>
      <tbody>
        {
          this.props.items.map(item => <tr>
            {heads.map(name => <td>{this.props.headers[name](item)}</td>)}
          </tr>)
        }
      </tbody>
    </table>
  },
})

module.exports = Tabular

