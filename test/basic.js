
import React from 'react'
import itreed from '..'
import Treed from 'treed/classy'
import MemPL from 'treed/pl/mem'

import ListView from 'treed/views/list'
import tests from './tests'
import runTests from './run-tests'

import {Form, FormSection, Radio, Panes} from '../../form'
import Config from '../config/'
import Modal from '../../modal'
import deepCopy from 'deep-copy'

import setupPlugins from './setup-plugins'
import fixture from './fixtures/basic'

setupPlugins()
run()

function run() {
  let config = {
    js: {
      kernels: {
        js: {
          variants: {
            // default: true,
            babel: {
            },
            clojurescript: {
              compiler: 'http://localhost:4432',
            },
          }
        }
      }
    },
    jupyter: {
      server: {
        host: 'localhost:8888',
      },
      kernels: {
        python2: {
          variants: {
            default: true,
            hy: true,
          }
        }
      }
    }
  }

  function changeConfig() {
    Modal.show({
      title: 'iTreed Config',
      initialState: {}, // deepCopy(config),
      body() {
        return <Form
          onSubmit={value => this.props.onClose(null, value)}
          initialData={config}>
          <Config
            variants={itreed.availableVariants}
            plugins={itreed.availablePlugins} name='*'/>
          <button type='submit'>
            Submit
          </button>
        </Form>
      },
      done(err, newConfig) {
        if (err || !newConfig) return console.error('Aborted config', err, newConfig)
        console.log('Rerender on config')
        config = newConfig
        makeFull(config, changeConfig)
      }
    })
  }

  changeConfig()
  // makeFull(config, changeConfig)
}

const pl = new MemPL()

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

  const treed = new Treed({plugins: plugins})
  treed.initStore(fixture, {pl})
    .then(store => {
      const props = treed.addView({
        actions: ListView.actions,
        keys: ListView.keys,
      })
      treed.keyManager.listen(window)
      window.viewProps = props
      window.treed = treed

      var headStore = treed.store.headerView()

      const heads = treed.options.plugins.map(plugin => {
        if (!plugin.view || !plugin.view.global) return null
        return plugin.view.global(headStore, onConfig)
      })

      React.render(<div>
        <div className='Main_header'>
          {heads}
        </div>
        <ListView {...props}/>
      </div>, document.getElementById("target"), () => {
        console.log('Done rendering initial!')
        // runTests(tests, props.store.actions, treed.store.onDone.bind(treed.store), () => {})
      })
    })
}

