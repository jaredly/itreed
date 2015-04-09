
import plugin from '../'

global.navigator = {}
global.window = {
}
global.document = {
  createElement: () => ({setAttribute() {}})
}


const formatters = [
  require('../formatters/live'),
  require('../formatters/live-button'),
  require('../formatters/react'),
  require('../formatters/vega'),
  require('../formatters/table'),
  require('../formatters/dom'),
  require('../formatters/latex'),
  require('../formatters/list-like'),
  require('../formatters/js'),
]

require('../plugins/itreed-js')

plugin({})

