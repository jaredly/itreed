
window.addEventListener('message', function(event) {
  console.log(event.data)
  switch (event.data.type) {
    case "notify":
      console.log('wanted to notify')
  }
  /*
  if (event.data.html) {
    new Notification('Templated!', {
      icon: 'icon.png',
      body: 'HTML Received for "' + event.data.name + '": `' +
          event.data.html + '`'
    });
  }
  */
});

