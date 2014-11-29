var gui = require('nw.gui');
var win = gui.Window.get();
var clipboard = gui.Clipboard.get();
var notifier = require('node-notifier');

var api_key = localStorage.getItem('pushbullet-api');
if($.trim(api_key)){
  init();
  connect(api_key);
}else{
  showLogin();
}

function showLogin(){
  win.resizeTo(450, 500);
  win.show();
  win.setShowInTaskbar(true);
  /* focus won't work for some reason */
  // win.focus(); 
}

function saveUser(){
  localStorage.setItem('pushbullet-api', api_key);
}

function signOut(){
  tray.remove();
  tray = null;
  localStorage.removeItem('pushbullet-api');
  showLogin();
}

function init(){

  tray = new gui.Tray({
      icon: 'images/trayicon-16x16.png'
  });

  tray.menu = new gui.Menu();

  tray.menu.append(new gui.MenuItem({
    label: 'sign out',
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

function connect(api_key){
  websocket = new WebSocket('wss://stream.pushbullet.com/websocket/' + api_key);
  websocket.onopen = function(e) {
    
  }
  websocket.onmessage = function(message) {

    notifier.notify({
      title: message.push.title,
      message: message.push.body,
      sound: true,
      wait: true 
    }, function (err, response) {
      
    });
  }
  websocket.onerror = function(e) {
      // messages.innerHTML += "<p>WebSocket onerror</p>";
  }
  websocket.onclose = function(e) {
      win.show();
      win.setShowInTaskbar(true);
  }
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

    api_key = $('#api-key').val();
    $('#api-key').val('');
    saveUser();
    init();
    connect(api_key);
  });
});


// gui.Screen.Init();
// var screens = gui.Screen.screens;
// var x = 0, y =  screens[0].bounds.height - screens[0].work_area.height;
// var tvHeight = Math.floor(screens[0].work_area.height / 2);
// var tvWidth = Math.floor(screens[0].bounds.width/2);