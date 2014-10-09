
var React = require('treed/node_modules/react')
  , PT = React.PropTypes

var KernelPicker = React.createClass({
  propTypes: {
    onCancel: PT.func,
    onPick: PT.func,
    kernels: PT.array,
  },

  getInitialState: function () {
    return {
      open: false,
    }
  },

  _toggleOpen: function () {
    this.setState({open: !this.state.open})
  },

  render: function () {
    return <div className='KernelPicker'>
      <span
          onClick={this._toggleOpen}
          className='KernelPicker_label'>
        Choose kernel
        <span onClick={this.props.onCancel}>&times;</span>
      </span>
      {this.state.open && <ul className='KernelPicker_list'>
        {this.props.kernels.map(kernel =>
          <li
              onClick={this.props.onPick.bind(null, kernel.kernel)}
              className='KernelPicker_item'>
            {kernel.kernel.id}
          </li>)}
      </ul>}
    </div>
  }
})

module.exports = KernelPicker
