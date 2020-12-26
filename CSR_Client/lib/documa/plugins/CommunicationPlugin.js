Documa.require('Documa.plugins.AbstractPlugin');
Documa.require('Documa.util.Util');
Documa.require('Documa.util.Logger');

Ext.namespace('Documa.plugins');
Documa.plugins.CommunicationPlugin = Ext.extend(Documa.plugins.AbstractPlugin, (function() {

	var TAG = 'Documa.plugins.CommunicationPlugin';

	var PLUGIN_NAME = 'CommunicationPlugin';

	var CLOSE = "close";

	var SEND = "send";

	var INIT = "init";

	var _log = Documa.util.Logger;
	;
	var _util = Documa.util.Util;

	return {
		constructor : function() {
			_log.debug(TAG, 'Creating ...');

			// call superclass
			Documa.plugins.CommunicationPlugin.superclass.constructor.call(this, [PLUGIN_NAME]);
		},

		onInitialized : function() {
			_log.debug(TAG, "Initialized");
		},

		onInitFailure : function(error) {
			_log.error(TAG, 'Error {' + error + '} during initialization!');
		},

		onMessageRecieved : function(message) {
			_log.debug(TAG, 'Message recieved from native layer: ' + message);
		},

		init : function(successCb, failureCb) {
			// call init-method of superclass
			Documa.util.Util.openCommunicationChannel(PLUGIN_NAME, this.onMessageRecieved, this.onInitFailure);
		},

		close : function(successCb, failureCb) {
			return _util.callNativeLayer(PLUGIN_NAME, CLOSE, successCb, failureCb, []);
		},

		/**
		 * Send event data with the help of native device functions to the SRTE.
		 * @param {Object} eventData event information send to the SRTE
		 * @param {Object} successCb callback function that is executed after the event
		 * data were send out successfully
		 * @param {Object} failureCb callback function that is executed during a failure
		 */
		send : function(msg, successCb, failureCb) {
			return _util.callNativeLayer(PLUGIN_NAME, msg.getMessageTag(), successCb, failureCb, [msg.toString()]);
		}

	};
})());
