Ext.namespace('Documa.ui.meta.subview');

Documa.require('Documa.util.Logger');

Documa.ui.meta.subview.DeviceOwnerView = Ext.extend(Object, (function() {
  
  var TAG = 'Documa.ui.meta.subview.DeviceOwner';
  var ID = 'csr-mui-deviceowner-block';

  var DEVICE_TILES = "device-tile-list";
  var HEADER  = "headbar";
  var USING_DEVICE_BLOCK = "csr-mui-used-device-block";
  
  var _log = Documa.util.Logger;
  var _controller = null;
  var _devicePanelController = null;

  /* jquery selector strings */
  var _tilesListSelector = '.'+ DEVICE_TILES +" ul";
  var _deviceInfoSelector = '#'+ USING_DEVICE_BLOCK;
  var _loaderSelector = '#'+ ID +' .loader-overlay-block';
  var _usingDevice = null;

  return {

    constructor: function(parent,controller){
      
      _controller = controller;
      

      $('#' + parent + ' div.wrapper').append('<div id="'+ ID +'" class="page center"></div>');
      $('#' + ID).html(
        '<div class="headbar">' +
          '<span><a class="icon-button home grey">Device Overview</a></span>' +
          '<span></span>' +
        '</div>' +
        '<div id="'+ USING_DEVICE_BLOCK + '"></div>' +
        '<div class="headbar big border">'+
          '<span class="text">Available Devices</span>' + 
          '<a class="icon-button reload float-right"></a>' + 
        '</div>' +
        '<div class="'+ DEVICE_TILES +'">' +
          '<div class="loader-overlay-block">' +
            '<div class="loader-animation blue"></div>' +
          '</div>' +
          '<ul></ul>' +
        '</div>');

      /* setup empty list*/
      this.clearDeviceList();

      /* set device infos */
      this.setDeviceBlock();

      /**
       * set USING_DEVICE_BLOCK as target  for component drag&drop events 
       * compDDGroup was created for components in SearchPanel:refresh()
       */

      $('.reload').on('click',function(){
        _controller.getDeviceEnvironment();
      });
    },

    /**
     * Returns the div id of the device owner view
     * @return {String} id
     */
    getId: function() {
      return ID;
    },

    /**
     * set classes for the view block. deletes all current classes.
     * @param {String} value String of class names
     */
    setClass: function(value) {
      $('#' + ID).attr("class",value);
    },

    showLoader: function() {
      $('.loader-overlay-block').addClass('showAnimation');
    },

    removeLoader: function() {
      $('.loader-overlay-block').removeClass('showAnimation');
    },

    /**
     * Returns the jQuery - Object , related to the device owner view div
     * @return {jQuery Object}
     */

    /**
     * Removes all tiles from the list
     */
    clearDeviceList: function() {
      $(_tilesListSelector).empty();
    },

    /**
     * updates the 'your device' block with given data
     * @param {[type]} data [description]
     */
    setDeviceBlock: function(data) {
      /* create html structur */
      $(_deviceInfoSelector).html(
        '<span class="big">YOUR DEVICE</span>' +
        '<span>' +
        '<p>Fujitsu Amilo PC</p>' +
        '<p class="small">CSR Desktop Client</p>' +
        '<a class="button blue  mui-showDeviceInformations ">Details</a>' +
        '<a class="button green mui-startappplication">New Application</a>' +
        '</span>');

      /* bind listener */
      $('#csr-mui-deviceowner-block .mui-startappplication').on('click', function(){
        _controller.startApplication();
      });

      /* show device */
       $('#csr-mui-deviceowner-block .mui-showDeviceInformations').on('click', function(){
        _controller.showDeviceInformations();
      });
      
    },

    addDeviceTile: function(tile){
      tile.disappear(); /* necessary, if existing tiles get updated*/
      $(_tilesListSelector).append(tile.html());
      tile.appear();
    },

    changeDeviceAppButton: function(state) {
      var b = $('.mui-startappplication');
      b.empty();
      b.addClass('button red mui-startappplication');
      b.html('Close Application');

      b.on('click',function(){
        alert('Anwendung beenden');
      });
    },
  };
})());