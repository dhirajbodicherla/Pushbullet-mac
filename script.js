var gui = require('nw.gui');
var win = gui.Window.get();
var clipboard = gui.Clipboard.get();
var notifier = require('node-notifier');
var connectForm = $('#connect-form')
var newPushForm = $('#new-push-form')
var pushBulletEndPoint = '';

var api_key;
if($.trim(localStorage.getItem('pushbullet-api'))){
  api_key = localStorage.getItem('pushbullet-api');
  init();
  connect(api_key);
}else{
  showLogin();
}

function showWindow(){
  win.show();
  win.setShowInTaskbar(true);
}

function hideWindow(){
  win.hide();
  win.setShowInTaskbar(false);
}

function showLogin(){
  win.resizeTo(450, 500);
  showWindow();
  connectForm.show();
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
    label: 'New Push',
    click: function(){
      showWindow();
      newPush();
    }
  }));

  tray.menu.append(new gui.MenuItem({
    label: 'All Pushes',
    click: function(){
      // allPushes();
    }
  }));

  tray.menu.append(new gui.MenuItem({
    type: 'separator'
  }));

  tray.menu.append(new gui.MenuItem({
    label: 'Sign Out',
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

  hideWindow();
}

function newPush(){
  newPushForm.show();
  var listOfDevices = newPushForm.find('.list-of-devices');
  listOfDevices.empty().append($('<option></option>').val(-1).text('All'));
  $.ajax({
    url: 'https://api.pushbullet.com/v2/devices',
    type: 'GET',
    beforeSend: function(xhr){xhr.setRequestHeader('Authorization', 'Bearer ' + api_key);},
    success: function (result) {
      $(result.devices).each(function(i, v){
        var option = $('<option></option>').val(v.iden).text(v.nickname);
        listOfDevices.append(option);
      });
    }
  });
}

function notifyPush(message){
  console.log('------------------------------------------------------------');
  console.log(message);
  return;
  notifier.notify({
    title: message.push.title,
    message: message.push.body,
    sound: true,
    wait: true 
  }, function (err, response) {
    
  });
}

function connect(api_key){
  websocket = new WebSocket('wss://stream.pushbullet.com/websocket/' + api_key);
  websocket.onopen = function(e) {
    
  }
  websocket.onmessage = function(message) {
    if (JSON.parse(message.data).type == 'tickle') {
      var timeStamp = message.timeStamp;
      $.ajax({
          url: 'https://api.pushbullet.com/v2/pushes?modified_after=' + timeStamp,
          type: 'GET',
          beforeSend: function(xhr){xhr.setRequestHeader('Authorization', 'Bearer ' + api_key);},
          success: function (result) {
              // console.log(result);
              notifyPush(result);
          }
      });
    }
  }
  websocket.onerror = function(e) {
      // messages.innerHTML += "<p>WebSocket onerror</p>";
  }
  websocket.onclose = function(e) {
      showWindow();
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
  
  connectForm.submit(function(e){
    e.preventDefault();
    
    api_key = $('#api-key').val();
    if($.trim(api_key)){
      $('#api-key').val('');
      connectForm.hide();
      saveUser();
      init();
      connect(api_key);
    }
  });

  newPushForm.submit(function(e){
    e.preventDefault();

    var self = $(this);
    var pushStatus = $(this).find('.push-status');
    var device_iden = $(this).find('.list-of-devices').val();
    var postData = {
      type: 'note',
      title: $('#new-push-title').val(),
      body: $('#new-push-message').val()
    };
    if(device_iden != -1){
      postData['device_iden'] = device_iden;
    }

    $.ajax({
      url: 'https://api.pushbullet.com/v2/pushes',
      type: 'POST',
      data: postData,
      beforeSend: function(xhr){xhr.setRequestHeader('Authorization', 'Bearer ' + api_key);},
      success: function (result) {
        pushStatus.addClass('text-success').text('Successfully Pushed !');
          self[0].reset();
          setTimeout(function(){
            // pushStatus.text('');
            // hideWindow();
          }, 2000);
          // notifyPush(result);
      },
      error: function(){
        pushStatus.addClass('text-danger').text('Oh Snap! Try again');
      }
    });
  });

  $('#new-push-cancel-btn').click(function(){
    $(this).find('.push-status').text('');
    hideWindow();
  });
});


// gui.Screen.Init();
// var screens = gui.Screen.screens;
// var x = 0, y =  screens[0].bounds.height - screens[0].work_area.height;
// var tvHeight = Math.floor(screens[0].work_area.height / 2);
// var tvWidth = Math.floor(screens[0].bounds.width/2);
