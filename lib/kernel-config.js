
import async from 'async'
import {plugins, variants} from '../registrar'

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
      const k = new plugins[name].Kernel(s, null, spec.kernelspecs[spec.default], docid)
      k.serverId = name
      k.id = spec.default
      if (s.initError) {
        return done(null, {server: s, kernels: {default: k}})
      }
      return k.init(err => {
        k.initError = err
        if (err) {
          return done(null, {
            server: s,
            kernels: {
              [k.id]: k
            }
          })
        }
        k.initVariants((variants[name] || {})[k.id], err => {
          return done(null, {
            server: s,
            kernels: {
              [k.id]: k
            }
          })
        })
      })
    }

    const tasks = {}
    for (let sname in config.kernels) {
      if (!spec.kernelspecs[sname]) {
        tasks[sname] = next => {
          const k = new plugins[name].Kernel(s, config.kernels[sname], spec.kernelspecs[sname], docid)
          k.initError = new Error(`Kernel not available from server ${name}: ${sname}`)
          next(null, k)
        }
        continue
      }
      tasks[sname] = next => {
        const k = new plugins[name].Kernel(s, config.kernels[sname], spec.kernelspecs[sname], docid)
        k.serverId = name
        k.id = sname
        if (s.initError) return next(null, k)
        k.init(err => {
          k.initError = err
          if (err) {
            return next(null, k)
          }
          k.initVariants((variants[name] || {})[k.id], err => {
            next(null, k)
          })
        })
      }
    }

    async.parallel(tasks, (err, kernels) => {
      done(err, {server: s, kernels})
    })
  })
}

