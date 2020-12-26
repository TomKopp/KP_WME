Ext.namespace('Documa.ui.capviewconfiguration');

Documa.require('Documa.ui.capviewconfiguration.CapViewConfigView');
Documa.require('Documa.ui.capviewconfiguration.CapViewConfigNotificationView');

/**
 * @class Documa.ui.capviewconfiguration.ConfigCVManager
 * This class creates and controls the Configuration contents
 *
 * @author Anne Schumacher
 */
Documa.ui.capviewconfiguration.ConfigCVManager = Ext.extend(Object, ( function () {
    var TAG = 'Documa.ui.capviewconfiguration.ConfigCVManager';
    var _log = Documa.util.Logger;
	var _this = null;

    var _configWindow = null;
    var _configNotificationView = null;

    return {
        constructor: function () {
            _configWindow = new Documa.ui.capviewconfiguration.CapViewConfigView(this);
            _configNotificationView = new Documa.ui.capviewconfiguration.CapViewConfiggNotificationView(this);
			_this = this;
        },

        /**
         * check if Config Window is visible
         */
        isVisible: function () {
            return _configWindow.isVisible();
        },

        /**
         * check if configNotificationWindow is visible
         */
        isVisibleDeviceNotification: function () {
            return _configNotificationView.isVisibleDeviceNotification();
        },

        /**
         * Method that shows the Ext.Window
         */
        show: function () {
            _configWindow.show();
        },

        /**
         * Method that shows the Ext.Panel with the id buddyPanel
         */
        showNewDeviceNotification: function(device_name) {
			var text = `New device "${device_name}" joined your application!`;
			var callback = () => {
				var uiManager = Documa.RuntimeManager.getUIManager();
				if (uiManager.getCapView() === uiManager.getActiveView()) {
					uiManager.getCapView().updateConfig();
					uiManager.getCapView().compileView();
				}
			};
			_configNotificationView.showDeviceNotification(text, callback);
        },

        /**
         * Method that hides the Ext.Window
         */
        hide: function () {
            _configWindow.close();
        },

        /**
         * Method that hides the Ext.Panel with the id buddyPanel
         */
        hideDeviceNotification: function () {
            _configNotificationView.closeDeviceNotification();
        },


        /**
         * toggle configDialog
         */
        toggle: function () {
            if (_configWindow.isVisible() === true) {
                _this.hide();
            } else {
                _this.show();
            }
        },

        /**
         * toggle DeviceNotification
         */
        toggleDeviceNotification: function () {
            if (_configNotificationView.isVisibleDeviceNotification() === true) {
                _this.hideDeviceNotification();
            } else {
                _this.showDeviceNotification();
            }
        },

        /**
         * returns Config window
         */
        getConfigWindow: function () {
            return _configWindow;
        },

        /**
         * returns Notification window
         */
        getCofigNotificationView: function () {
            return _configNotificationView;
        }
    };
}()));
