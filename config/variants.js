
import React from 'react'
import {Form, FormSection, Radio} from '../../form'
import {fromJS, Map} from 'immutable'
import css from './css'
import {shared, sharedDecs} from './shared'

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

export default function renderVariants(available, configured, onChange) {
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
  return <ul className={styles.variantsList}>
    <li className={styles.variant}>
      <label className={styles.variantHead}>
        <input type='checkbox' className={shared.checkbox} checked={!!configured.get('default')}
          onChange={_ => toggle('default')}/>
        default
      </label>
    </li>
    {names.map(name => <li key={name} className={styles.variant}>
      <label className={styles.variantHead}>
        <input type='checkbox' className={shared.checkbox} checked={!!configured.get(name)}
          onChange={_ => toggle(name)}/>
        {available[name].displayName || name}
      </label>
      {configured.get(name) && available[name].config && FormSection.fromSpec({
        spec: available[name].config,
        value: configured.get(name),
        onChange: val => onChange(configured.set(name, val)),
        styles: shared.form.styles,
      })}
    </li>)}
  </ul>
}

const {styles, decs} = css`
variantsList {
  ${sharedDecs.children.style}
}
variant {
  display: flex
  ${sharedDecs.head.style}
}
variantHead {
  padding: 10px
  display: block
  cursor: pointer
  flex: 1
}

variantConfig {
  padding: 10px
}
`

