Ext.namespace('Documa.plugins');

Documa.require('Documa.plugins.AbstractPlugin');
Documa.require('Documa.util.Util');
Documa.require('Documa.util.Logger');

Documa.plugins.DiscoveryPlugin = Ext.extend(Documa.plugins.AbstractPlugin, (function() {
	var PLUGIN_NAME = 'DiscoveryPlugin';

	var TAG = 'Documa.plugins.DiscoveryPlugin';

	var GET_DEVICES = "getDevices";

	var SEARCH = "search";

	var INIT = "init";

	var TEST = "test";

	var _log = Documa.util.Logger;

	return {

		constructor : function() {
			this.util = Documa.util.Util;
			_log.debug(TAG, 'Constructing ...');
			Documa.plugins.DiscoveryPlugin.superclass.constructor.call(this, [PLUGIN_NAME]);
		},

		onInitFailure : function(error) {
			_log.error(TAG, 'Error {' + error + '} during initialization!');
		},

		onMessageRecieved : function(message) {
			_log.debug(TAG, 'Message recieved from native layer: ' + message);
		},

		search : function(successCb, failureCb) {
			return this.util.callNativeLayer(PLUGIN_NAME, SEARCH, successCb, failureCb, []);
		},

		getDevices : function(successCb, failureCb) {
			return this.util.callNativeLayer(PLUGIN_NAME, GET_DEVICES, successCb, failureCb, []);
		},

		init : function(successCb, failureCb) {
			Documa.util.Util.openCommunicationChannel(PLUGIN_NAME, this.onMessageRecieved, this.onInitFailure);
		},

		test : function(successCb, failureCb) {
			return this.util.callNativeLayer(PLUGIN_NAME, TEST, successCb, failureCb, []);
		}

	};
})());