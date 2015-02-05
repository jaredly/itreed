
var React = require('react/addons')
  , cx = React.addons.classSet

var DEFAULT_STYLE = `
html {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-content: center;
  flex: 1;
  min-height: 100%;
}
html.focused {
  box-shadow: 0 0 10px blue inset;
}
html.focused:before {
  color: #ddd;
  content: "this frame has focus!";
  font-family: sans-serif;
  font-size: 30px;
  font-weight: bold;
  padding: 5px;
  position: absolute;
  right: 10px;
  top: 0;
  z-index: -10;
}
body {
  margin: 0;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
`;

module.exports = function (frame, onFocus) {
  var doc = frame.contentDocument
    , style = doc.createElement('style')
    , custom = doc.createElement('style')
    , win = frame.contentWindow
  style.innerHTML = DEFAULT_STYLE;
  doc.head.appendChild(style);
  doc.head.appendChild(custom);

  win.React = React
  win.cx = cx
  win.addEventListener('focus', () => {
    doc.body.parentNode.classList.add('focused')
    onFocus()
  })
  win.addEventListener('blur', () => doc.body.parentNode.classList.remove('focused'))
  // TODO are there other things I want exposed on this window?
  return custom
}

