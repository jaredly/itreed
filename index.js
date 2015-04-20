
import plugin from './lib'
export default plugin

import plugins from './registrar'
plugin.register = function (mod) {
  plugins[mod.id] = mod
}

