var gui = require('nw.gui');
// gui.Screen.Init();
// var screens = gui.Screen.screens;
win = gui.Window.get();
var clipboard = gui.Clipboard.get();
var notifier = require('node-notifier');

// var x = 0, y =  screens[0].bounds.height - screens[0].work_area.height;
// var tvHeight = Math.floor(screens[0].work_area.height / 2);
// var tvWidth = Math.floor(screens[0].bounds.width/2);

if(localStorage.getItem('pushbullet-api') != null){
  ID = localStorage.getItem('pushbullet-api');
  connect();
}else{
  showLogin();
}

function showLogin(){
  win.resizeTo(450, 500);
  win.show();
  win.setShowInTaskbar(true);
  // win.focus();
}

function saveUser(){
  localStorage.setItem('pushbullet-api', $('#api-key').val());
}

function signOut(){
  localStorage.removeItem('pushbullet-api');
  showLogin();
}

function connect(){

  tray = new gui.Tray({
      icon: 'images/trayicon-16x16.png'
  });

  tray.menu = new gui.Menu();

  tray.menu.append(new gui.MenuItem({
    label: 'Sign out',
    click: function(){
      signOut();
    }
  }));
  tray.menu.append(new gui.MenuItem({
    label: 'Quit',
    click: function(){
      gui.App.quit();
    }
  }));

  win.hide();
  win.setShowInTaskbar(false);
}

$(document).ready(function(){
  $('input').on('keydown', function(e){
    if (e.which == 86) {
        if (e.metaKey || e.ctrlKey) {
            $(this).val(clipboard.get('text'));
        }
    }
  })
  
  $('#connect-form').submit(function(e){
    e.preventDefault();

    var self = this;

    websocket = new WebSocket('wss://stream.pushbullet.com/websocket/' + $('#api-key').val());
    websocket.onopen = function(e) {
      $('#api-key').val('');
      saveUser();
      connect();
    }
    websocket.onmessage = function(e) {
        notifier.notify({
          title: 'My awesome title',
          message: 'Hello from node, Mr. User!',
          sound: true, // Only Notification Center or Windows Toasters
          wait: true // wait with callback until user action is taken on notification
        }, function (err, response) {
          // response is response from notification
        });
    }
    websocket.onerror = function(e) {
        // messages.innerHTML += "<p>WebSocket onerror</p>";
    }
    websocket.onclose = function(e) {
        win.show();
        win.setShowInTaskbar(true);
    }
  });
});