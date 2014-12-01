var DEBUG = 0;
if(!DEBUG){
  var gui = require('nw.gui');
  var win = gui.Window.get();
  var clipboard = gui.Clipboard.get();
  var notifier = require('node-notifier');
  var path = require('path');
}
var connectForm = $('#connect-form');
var newPushForm = $('#new-push-form');
var allPushesContainer = $('#all-pushes');
var pushBulletEndPoint = '';
var latestPushTimestamp;

if(DEBUG){
  var api_key = '';
  newPush();
}else{
  var api_key;
  if($.trim(localStorage.getItem('pushbullet-api'))){
    api_key = localStorage.getItem('pushbullet-api');
    init();
    connect(api_key);
  }else{
    showLogin();
  }
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
      showWindow();
      allPushes();
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
  var m;
  if(message.type === "note"){
    m = {
      title: message.title,
      body: message.body
    };
  }else if(message.type === "link"){
    m = {
      title: message.title,
      body: message.body + '<br />' + message.url
    };
  }else if(message.type === "address"){
    m = {
      title: message.name,
      body: message.address
    };
  }else if(message.type === "list"){


  }else if(message.type === "file"){
    m = {
      title: message.file_name,
      body : message.body + '<br />' + message.file_url
    }
  }
  notifier.notify({
    title: m.title,
    message: m.body,
    icon: 'icons/128x128.png',
    sound: true,
    wait: true 
  }, function (err, response) {
    if(message.type === "link"){
      gui.Shell.openExternal(message.url);
    }else if(message.type === "file"){
      gui.Shell.openExternal(message.file_url);
    }
  });
}

function allPushes(){
  allPushesContainer.show();
  $.ajax({
    url: 'https://api.pushbullet.com/v2/pushes?modified_after=0',
    type: 'GET',
    beforeSend: function(xhr){xhr.setRequestHeader('Authorization', 'Bearer ' + api_key);},
    success: function (result) {
      var pushes = $.grep(result.pushes, function(v){ return v.active === true});
      pagination(pushes, allPushesContainer.find('.pushes-container').html(''));
    }
  });
}

function connect(api_key){
  websocket = new WebSocket('wss://stream.pushbullet.com/websocket/' + api_key);
  websocket.onopen = function(e) {
    $.ajax({
      url: 'https://api.pushbullet.com/v2/pushes?modified_after=0',
      type: 'GET',
      beforeSend: function(xhr){xhr.setRequestHeader('Authorization', 'Bearer ' + api_key);},
      success: function (result) {
        latestPushTimestamp = result.pushes[0].modified;
      }
    });
  }
  websocket.onmessage = function(message) {
    if (JSON.parse(message.data).type == 'tickle') {
      $.ajax({
          url: 'https://api.pushbullet.com/v2/pushes?modified_after=' + latestPushTimestamp,
          type: 'GET',
          beforeSend: function(xhr){xhr.setRequestHeader('Authorization', 'Bearer ' + api_key);},
          success: function (result) {
            latestPushTimestamp = result.pushes[0].modified;
            notifyPush(result.pushes[0]);
          }
      });
    }
  }
  websocket.onerror = function(e) {
      signOut();
      connectForm.find('.status').addClass('text-danger').text('Authentication failed !');
  }
  websocket.onclose = function(e) {
      showWindow();
  }
}

function pagination(items, el) {
    this.$el = el;
    var $ul = $('<ul></ul>');
    var self = this;
    var total = items.length;
    var length = 9;
    var start = 0;
    var end = 0;
    var page = 0;
    var nextButton = $('<input>')
        .addClass('btn btn-primary')
        .attr('type', 'button')
        .val('More');
    var closeButton = $('<input>')
        .addClass('btn btn-default close-btn')
        .attr('type', 'button')
        .val('Close');
    
    this.$el.append($ul).append(nextButton).append(closeButton);
    this.paginate = function () {
        page++;
        end = length * page < total ? length * page : total;
        for (var i = start; i < end; i++) {
          if(items[i].active){
            var li = $('<li></li>').html(renderPush(items[i]));
            self.$el.find('ul').append(li);
          }
        }
    };
    this.paginate();
    nextButton.on('click', function (e) {
        if(end === total) return;
        start += length;
        self.paginate();
    });
}

function renderPush(push){
  var tpl, data;
  if(push.type === 'note'){
    data = {
      title: push.title,
      body: push.body
    };
    tpl = '<div class="push-item note">'+
            '<p class="title">{title}</p>'+
            '<p>{body}</p>'+
          '</div>';
  }else if(push.type === 'link'){
    data = {
      title: push.title,
      body: push.body,
      url: push.url
    };
    tpl = '<div class="push-item link">'+
            '<p class="title">{title}</p>'+
            '<p class="body">{body}<br/>{url}</p>'+
          '</div>';
  }else if(push.type === 'address'){
    data = {
      name: push.name,
      address: push.address
    };
    tpl = '<div class="push-item address">'+
            '<p class="name">{name}</p>'+
            '<p class="address">{address}</p>'+
          '</div>';
  }else if(push.type === 'list'){
    data = {
      message: 'work-in-progess'
    };
    tpl = '<div>{message}</div>';
  }else if(push.type === 'file'){
    data = {
      file_name: push.file_name,
      file_type: push.file_type,
      file_url: push.file_url,
      body: push.body
    }
    tpl = '<div class="push-item file">'+
            '<p class="name">{file_name}</p>'+
            '<p class="body">{body}</p>'+
            '<p class="url">{file_url}</p>'+
          '</div>';
  }else{
    data = -1;
  }

  return data === -1 ? null : nano(tpl, data);
}

function nano(template, data) {

  /* Nano Templates (Tomasz Mazur, Jacek Becela) */


  return template.replace(/\{([\w\.]*)\}/g, function(str, key) {
    var keys = key.split("."), v = data[keys.shift()];
    for (var i = 0, l = keys.length; i < l; i++) v = v[keys[i]];
    return (typeof v !== "undefined" && v !== null) ? v : "";
  });
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
    
    connectForm.find('.status').text('');
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
    var pushStatus = $(this).find('.status');
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
          // self[0].reset();
          // setTimeout(function(){
          //   pushStatus.text('');
          //   newPushForm.hide();
          //   hideWindow();
          // }, 2000);
          // notifyPush(result);
      },
      error: function(){
        pushStatus.addClass('text-danger').text('Oh Snap! Try again');
      }
    });
  });

  $('#new-push-cancel-btn').click(function(){
    $(this).find('.status').text('');
    newPushForm.hide();
    hideWindow();
  });

  allPushesContainer.on('click', '.close-btn',function(){
    allPushesContainer.hide();
    hideWindow();
  });

  newPushForm.on('change', '#push-type', function(){
    var type = $(this).val();
    $('.push-type-input').hide();
    if(type == 2){
      $('#new-push-url').fadeIn();
    }else if(type == 3){
      $('#new-push-address').fadeIn();
    }else if(type == 4){
      $('#new-push-list').fadeIn();
    }else if(type == 5){
      $('#new-push-file').fadeIn();
    }else{

    }
  })
});


// gui.Screen.Init();
// var screens = gui.Screen.screens;
// var x = 0, y =  screens[0].bounds.height - screens[0].work_area.height;
// var tvHeight = Math.floor(screens[0].work_area.height / 2);
// var tvWidth = Math.floor(screens[0].bounds.width/2);
