
import React from 'react'
import itreed from '..'
import Treed from 'treed/classy'
import MemPL from 'treed/pl/mem'

import JS from '../plugins/itreed-js'
import ListView from 'treed/views/list'
import tests from './tests'
import runTests from './run-tests'

import {Form, Radio} from '../../form'
import Modal from '../../modal'
import deepCopy from 'deep-copy'

itreed.register(JS)

run()

function run() {
  let config = {
    js: {}
  }

  function changeConfig() {
    Modal.show({
      initialState: deepCopy(config),
      body() {
        return <div>
          H1ll
        </div>
      },
      buttons: {
        Save: 'submit',
        Cancel: 'cancel',
      },
      done(err, newConfig) {
        config = newConfig
        makeFull(config, changeConfig)
      }
    })
  }

  makeFull(config, changeConfig)
}

function makeFull(itConfig, onConfig) {
  const plugins = [
    require('treed/plugins/undo'),
    require('treed/plugins/todo'),
    require('treed/plugins/image'),
    require('treed/plugins/types'),
    require('treed/plugins/collapse'),
    require('treed/plugins/clipboard'),
    require('treed/plugins/lists'),
    require('treed/plugins/rebase'),
    itreed(itConfig)
  ]

  const pl = new MemPL()
  const treed = new Treed({plugins: plugins})
  treed.initStore({
    content: 'Awesome',
    children: []
  }, {pl})
    .then(store => {
      const props = treed.addView({
        actions: ListView.actions,
        keys: ListView.keys,
      })
      treed.keyManager.listen(window)
      window.viewProps = props

      var headStore = treed.store.headerView()

      const heads = treed.options.plugins.map(plugin => {
        if (!plugin.view || !plugin.view.global) return null
        return plugin.view.global(headStore, onConfig.bind(null, plugin.id))
      })

      React.render(<div>
        <div className='Main_header'>
          {treed.options.plugins.map(plugin =>
            plugin.view && plugin.view.global && plugin.view.global(headStore)
          )}
        </div>
        <ListView {...props}/>
      </div>, document.getElementById("target"), () => {
        console.log('Done rendering initial!')
        // runTests(tests, props.store.actions, treed.store.onDone.bind(treed.store), () => {})
      })
    })
}

