
import React from 'react'
import Plugin from './plugin'

export default class Config extends React.Component {
  renderPlugins() {
    return Object.keys(this.props.plugins).map(id => {
      return <li className='ITConfig_plugin'>
        <Plugin value={this.props.value.get(id)}
          name={id}
          onChange={val => {
            if (val === null) this.props.onChange(this.props.value.delete(id))
            else this.props.onChange(this.props.value.set(id, val))
          }}
          variants={this.props.variants[id] || {}}
          plugin={this.props.plugins[id]}/>
      </li>
    })
  }

  render() {
    return <div>
      {this.renderPlugins()}
    </div>
  }
}

