/* @flow */

var React = require('treed/node_modules/react')
  , Modal = require('./modal')

module.exports = showModal

type Cb = (err: ?Error, ...a: any) => void;

function showModal<T>(title: string, body: any, done: Cb) {
  var node = document.createElement('div')
  document.body.appendChild(node)
  var onClose = function (err: ?Error) {
    node.parentNode.removeChild(node)
    done.apply(null, arguments)
  }
  React.render(<Modal
    onClose={onClose}
    title={title}
    body={body} />, node)
}

