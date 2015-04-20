
import async from 'async'
import plugins from '../registrar'

export default function handleConfig(config, docid, done) {
  const tasks = {}
  for (let name in config) {
    if (!plugins[name]) {
      throw new Error(`Invalid config! Unknown plugin ${name}`)
    }
    tasks[name] = initServer.bind(null, name, config[name], docid)
  }

  async.parallel(tasks, done)
}

function initServer(name, config, docid, done) {
  const s = new plugins[name].Server(config.server)

  s.init((err, spec) => {
    s.initError = err

    if (!config.kernels) {
      const k = new plugins[name].Kernel(s, null, docid)
      k.serverId = name
      k.id = 'default'
      if (s.initError) {
        return done(null, {server: s, kernels: {default: k}})
      }
      return k.init(err => {
        k.initError = err
        done(null, {
          server: s,
          kernels: {
            default: k
          }
        })
      })
    }

    const tasks = {}
    for (let sname in config.kernels) {
      if (!spec[sname]) {
        throw new Error(`Kernel not available from server ${name}: ${sname}`)
      }
      tasks[sname] = next => {
        const k = new plugins[name].Kernel(s, spec[sname], docid)
        k.serverId = name
        k.id = sname
        if (s.initError) return next(null, k)
        k.init(err => {
          k.initError = err
          next(null, k)
        })
      }
    }

    async.parallel(tasks, (err, kernels) => {
      done(err, {server: s, kernels})
    })
  })
}

