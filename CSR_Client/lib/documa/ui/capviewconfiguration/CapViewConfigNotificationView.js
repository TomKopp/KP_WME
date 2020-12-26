Ext.namespace('Documa.ui.capviewconfiguration');

Documa.require('Documa.util.Logger');

Documa.require('Documa.RuntimeManager');


Documa.require('Documa.ui.capviewconfiguration.CapViewConfigView');
Documa.require('Documa.ui.capviewconfiguration.ConfigCVManager');

/**
 * @class Documa.ui.capviewconfiguration.CapViewConfigNotificationView
 * Sends message, if the device or component lists are updated
 *
 */

Documa.ui.capviewconfiguration.CapViewConfiggNotificationView = Ext.extend(Object, (function () {

    var _configNotificationView = null;
    var _visible = false;
    var _this = null;

	var callback_on_accept = null;

    return {
        constructor: function (controller) {
            _this = this;
            _configNotificationView = controller;

            _configNotificationView = new Ext.Window({
                id: 'deviceNotification-window',
                xtype: window,
                width: '300px',
                modal:false,
                frame: true,
                header: false,
                hidden: true,
                closable: false,
                resizable: false,
                draggable: false,
                shadow: false,
                baseCls: "deviceNotification",
                html:'<div class="alert alert-dismissible alert-warning" id="device-notification"></div>',
                tools: [{
                    id: 'DeviceNotification-close-button',
                    type: 'refresh',
                    tooltip: 'Refresh form Data',
                    handler: function () {
                        _this.closeDeviceNotification();
                    }
                }],
                buttons:[
                    {
                        html    : '<button id="modalbtn-1" type="button" class="btn btn-default" >Accept</button>',
                        type    : 'button',
                        handler : function (){
							if (callback_on_accept) {
								callback_on_accept.call();
							}
							_this.closeDeviceNotification();
                        }
                    },
                    {
                        html    : '<button id="modalbtn-2" type="button" class="btn btn-default" >Ignore</button>',
                        type    : 'button',
                        handler: function(){ _this.closeDeviceNotification();}
                    }
                ],
                listeners: {
                    'beforeshow': {
                        scope: this,
                        fn: function (window) {
                            //positioning the window on the right border of the canvas
                            window.setPosition(Documa.RuntimeManager.getUIManager().getCanvasWidth()-330, 60);
                        }
                    }
                }
			});
        },

        /**
         * Open the message, if Devices are updated
         */
        showDeviceNotification: function (text, callback) {
			if (typeof callback === 'function') {
				callback_on_accept = callback;	
			}

            // show stuff
            if (_visible === false) {
                _configNotificationView.show();
            }
            $('#device-notification').text(text + ' Do you want to update the capview?');
        },

        /**
         * Close the message, if Devices are updated
         */
        closeDeviceNotification: function () {
            _visible = false;
            _configNotificationView.hide();
			callback_on_accept = null;
        },

        /**
         * check if NotificationPanel is visible
         */
        isVisibleDeviceNotification: function () {
            return _visible;
        }

    };
})());
