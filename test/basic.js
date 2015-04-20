
import React from 'react'
import itreed from '..'
import Treed from 'treed/classy'
import MemPL from 'treed/pl/mem'

import JS from '../plugins/itreed-js'
import ListView from 'treed/views/list'
import tests from './tests'

itreed.register(JS)

const plugins = [
  require('treed/plugins/undo'),
  require('treed/plugins/todo'),
  require('treed/plugins/image'),
  require('treed/plugins/types'),
  require('treed/plugins/collapse'),
  require('treed/plugins/clipboard'),
  require('treed/plugins/lists'),
  require('treed/plugins/rebase'),
  // require('../../treed-plugins/custom-css'),
  // require('../../../scriptures/plugin'),
  itreed({
    js: { }
  })
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

    React.render(<div>
      <div className='Main_header'>
        {treed.options.plugins.map(plugin =>
          plugin.view && plugin.view.global && plugin.view.global(headStore)
        )}
      </div>
      <ListView {...props}/>
    </div>, document.getElementById("target"), () => {
      console.log('Done!')
      runTests(tests, props.store.actions, treed.store.onDone.bind(treed.store), () => {})
      // const failed = results.reduce((a,b) => a+b)
      // console.log(`Test results: ${failed} failed out of ${results.length}`)
    })
  })

import async from 'async'

function runTests(tests, actions, setDone, done) {
  const results = []
  const tasks = Object.keys(tests).map(name => {
    return next => {
      const subs = tests[name].map(action => next => {
        setDone(err => {
          results.push(err ? 1 : 0)
          if (err) {
            console.warn('Failed Test')
            console.error(err)
            console.error(err.message)
            console.error(err.stack)
          }
          next()
        })
        try {
          actions[action]()
        } catch (e) {
          console.warn('Failed Test')
          console.error(e)
          console.error(e.message)
          console.error(e.stack)
          return next(e)
        }
      })
      async.series(subs, next)
    }
  })
  async.series(tasks, done)
}


