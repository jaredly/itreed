
import async from 'async'

export default function runTests(tests, actions, setDone, done) {
  const results = []
  const tasks = Object.keys(tests).map(name => {
    return next => {
      const subs = tests[name].map(action => next => {
        setDone(err => {
          setDone(null)
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

