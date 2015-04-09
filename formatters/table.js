
var React = require('react')
  , format = require('../lib/format')

module.exports = {
  mime: 'json/table',
  display: function (value, store) {
    if (!value.rows) {
      value = {header: null, rows: value}
    }
    return <TableViewer data={value} store={store}/>
  }
}

function show(value, store) {
  return format.display(null, value, store)
}

var TableViewer = React.createClass({
  componentDidMount: function () {
  },
  render: function () {
    var data = this.props.data
      , store = this.props.store
      , header = data.header
      , rows = data.rows
    return <table>
      {header && <thead>
        <tr>
          {header.map(item => <th>{show(item, store)}</th>)}
        </tr>
      </thead>}
      <tbody>
        {rows.map(row => <tr>
          {row.map(item => <td>{show(item, store)}</td>)}
        </tr>)}
      </tbody>
    </table>
  }
})


