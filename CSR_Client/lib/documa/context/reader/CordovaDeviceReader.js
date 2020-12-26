Ext.namespace('Documa.discovery.reader');

Documa.require('Documa.util.Logger');
Documa.require("Documa.discovery.reader.DeviceReader");

/**
 * Uses the org.apache.cordova.file plugin to access directories and files on mobile
 * devices ( https://github.com/apache/cordova-plugin-file )
 * @class
 */
Documa.discovery.reader.CordovaDeviceReader = Ext.extend(Documa.discovery.reader.DeviceReader, function () {

	var TAG = 'Documa.discovery.reader.CordovaDeviceReader';
	var _log = Documa.util.Logger;
	var _deviceReady = null;

	/**
	 * Helper function, resoves connection type
	 * @return {String} connection type
	 */
	var _networkState = function () {
		var states = {};
		states[Connection.UNKNOWN] = 'UNKNOWN';
		states[Connection.ETHERNET] = 'ETHERNET';
		states[Connection.WIFI] = 'WIFI';
		states[Connection.CELL_2G] = 'CELL_2G';
		states[Connection.CELL_3G] = 'CELL_3G';
		states[Connection.CELL_4G] = 'CELL_4G';
		states[Connection.CELL] = 'CELL';
		states[Connection.NONE] = 'NONE';
		return states[navigator.connection.type];
	};

	return {
		/**
		 * Promise based constructor, encapsulates cordova api initialisation.
		 * @constructs
		 */
		constructor: function () {
			Documa.discovery.reader.CordovaDeviceReader.superclass.constructor.call(this);
			/* basic cordova initialisation */
			_deviceReady = new Promise(function (resolve, reject) {
				document.addEventListener('deviceready', resolve, false);
				/* EventListener has no error handling. Reject the promise after 10 seconds */
				setTimeout(function () {
					reject('deviceready has not fired after 10 seconds.');
				}, 10000);
			});
		},
		/**
		 * @returns {Promise}
		 */
		getDeviceInfo: function () {
			return new Promise(function (resolve, reject) {
				_deviceReady.then(function () {
					resolve({
						model: device.model,
						platform: device.platform,
						uuid: device.uuid,
						version: device.version
					});
				}, reject);
			});
		},
		/**
		 * @returns {Promise}
		 */
		getNetworkInfo: function () {
			return new Promise(function (resolve, reject) {
				_deviceReady.then(function () {
					resolve({
						connection: _networkState()
					});
				}, reject);
			});
		},
		/**
		 * @returns {Promise}
		 */
		getBatteryInfo: function () {
			return new Promise(function (resolve, reject) {
				_deviceReady.then(function () {
					window.addEventListener("batterystatus", function (info) {
						resolve({
							level: info.level,
							plugged: info.isPlugged
						});
					}, false);
					setTimeout(function () {
						reject('batterystatus has not fired after 5 seconds.');
					}, 5000);
				}, reject);
			});
		},
		/**
		 * @returns {Promise}
		 */
		getBatterCriticalAlert: function () {
			return new Promise(function (resolve, reject) {
				_deviceReady.then(function () {
					window.addEventListener("batterycritical", function (info) {
						resolve({
							level: info.level,
							plugged: info.isPlugged
						});
					}, false);
				}, reject);
			});
		},
		/**
		 * @returns {Promise}
		 */
		getBatteryLowAlert: function () {
			return new Promise(function (resolve, reject) {
				_deviceReady.then(function () {
					window.addEventListener("batterylow", function (info) {
						resolve({
							level: info.level,
							plugged: info.isPlugged
						});
					}, false);
				}, reject);
			});
		}
	};

}());