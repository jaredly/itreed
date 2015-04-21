
import React from 'react'
import {Form, FormSection, Radio} from '../../form'
import {fromJS, Map} from 'immutable'

export default class Plugin extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: false,
      error: null,
      specs: null
    }
  }

  componentDidMount() {
    if (this.props.value) {
      this.getSpecs()
    }
  }

  getSpecs() {
    this.setState({
      loading: true,
      error: null,
      specs: null,
    })
    this.props.plugin.Server.getSpecs(this.props.value.toJS().server, (err, specs) => {
      if (err) return this.setState({loading: false, error: err})
      this.setState({
        loading: false,
        error: null,
        specs,
      })
    })
  }

  onToggleChecked() {
    if (!this.props.value) {
      this.props.onChange(fromJS({
        server: getDefaultConfig(this.props.plugin.serverConfig),
        kernels: {},
      }))
    } else {
      this.props.onChange(null)
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.value !== this.props.value && this.props.value && (
      !prevProps.value ||
      this.props.value.get('server') !== prevProps.value.get('server'))) {
      this.getSpecs()
    }
  }

  onChangeServer(value) {
    this.props.onChange(this.props.value.set('server', value))
  }

  toggleKernel(name) {
    const config = this.props.value.getIn(['kernels', name])
    if (!config) {
      this.props.onChange(this.props.value.setIn(['kernels', name], fromJS({
        variants: {
          default: true
        }
      })))
    } else {
      this.props.onChange(this.props.value.deleteIn(['kernels', name]))
    }
  }

  setVariants(kernel, variants) {
    this.props.onChange(this.props.value.setIn(['kernels', kernel, 'variants'], variants))
  }

  renderSpecs() {
    if (this.state.loading) {
      return 'Getting server information...'
    }
    if (this.state.error) {
      return <div className='ITCPlugin_error'>
        Failed to get server information:
        {this.state.error.message}
      </div>
    }
    if (!this.state.specs) {
      return 'Server gave invalid kernel information'
    }
    const config = this.props.value
    const specs = this.state.specs.kernelspecs
    const names = Object.keys(specs)
    const unavailables = config.get('kernels').keySeq().filter(v => !specs[v]).cacheResult()
    const variants = this.props.variants
    return <ul>
      {names.map(name => <li key={name}>
        <label className='checkbox-label'>
          <input type='checkbox'
            checked={!!config.getIn(['kernels', name])}
            onChange={this.toggleKernel.bind(this, name)}/>
          {specs[name].spec.display_name}
        </label>
        {config.getIn(['kernels', name]) ? renderVariants(
          this.props.variants[name] || {},
          config.getIn(['kernels', name, 'variants']),
          this.setVariants.bind(this, name)) : null}
      </li>)}
      {unavailables.size ? <li>Unavailable:</li> : null}
      {unavailables.size ? unavailables.map(name => <li>{name}</li>) : null}
    </ul>
  }

  render() {
    const {name, value, plugin} = this.props
    return <div className={'ITCPlugin'}>
      <div className={'ITCPlugin_head'}>
        <label>
          <input type="checkbox" onChange={this.onToggleChecked.bind(this)} checked={!!value}/>
          {plugin.displayName}
        </label>
        {value && plugin.serverConfig &&
          Form.fromSpec({
            nested: true,
            spec: plugin.serverConfig,
            value: value.get('server'),
            onSubmit: this.onChangeServer.bind(this),
            buttonText: '✓',
          })}
      </div>
      {value ? <div className='ITCPlugin_body'>
        {this.renderSpecs()}
      </div> : null}
    </div>
  }
}


function getDefaultConfig(spec) {
  if (!spec) return true
  const ret = {}
  for (let name in spec) {
    const val = spec[name]
    if (val.type === 'section') {
      ret[name] = getDefaultConfig(val.spec)
    } else if (val.defaultValue) {
      ret[name] = val.defaultValue
    } else {
      ret[name] = {
        string: '',
        checkbox: false,
      }[val.type]
    }
  }
  return ret
}


function renderVariants(available, configured, onChange) {
  const names = Object.keys(available)

  if (!names.length && (!configured || configured.equals(Map({default: true})))) {
    return null
  }
  if (!configured) {
    configured = Map()
  }

  function toggle(name) {
    if (configured.get(name)) {
      onChange(configured.delete(name))
    } else {
      if (name === 'default') {
        onChange(configured.set(name, true))
      } else {
        onChange(configured.set(name, fromJS(getDefaultConfig(available[name].config))))
      }
    }
  }

  const unavailables = configured.keySeq().filter(v => !available[v]).cacheResult()
  return <ul>
    <li>
      <label className='text-label'>
        <input type='checkbox' checked={!!configured.get('default')}
          onChange={_ => toggle('default')}/>
        default
      </label>
    </li>
    {names.map(name => <li>
      <label className='text-label'>
        <input type='checkbox' checked={!!configured.get(name)}
          onChange={_ => toggle(name)}/>
        {available[name].displayName || name}
      </label>
      {configured.get(name) && available[name].config && FormSection.fromSpec({
        className: 'VariantConfig',
        spec: available[name].config,
        value: configured.get(name),
        onChange: val => onChange(configured.set(name, val)),
      })}
    </li>)}
  </ul>
}

