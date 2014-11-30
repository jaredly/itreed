
var React = require('treed/node_modules/react/addons')
  , cx = React.addons.classSet
  , sources = require('./sources')

var Sourcerer = React.createClass({
  _imoportFrom: function (name) {
    sources[name].select((err, data, config) => {
      if (err) return console.warn('failed to source')
      this.props.onSourced(data, {config: config, id: name})
    })
  },

  render: function () {
    return <div className='Sourcerer'>
      Import from:
      <ul className='Sourcerer_list'>
        {
          Object.keys(sources).map(name => <li>
            <button onClick={this._imoportFrom.bind(null, name)}>
              {sources[name].title}
            </button>
          </li>)
        }
      </ul>
    </div>
  },
})

module.exports = Sourcerer

