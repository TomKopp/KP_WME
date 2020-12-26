Ext.namespace('Documa.discovery.reader');

/**
 * Abstract class that encapsulates the provision of several runtime apis.
 * @class
 */
Documa.discovery.reader.DeviceReader = Ext.extend(Object, function(){
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function(){
			// nothing to do here
		},
		/**
		 * Returns the battery info promise.
		 * @returns {Promise}
		 */
		getBatteryInfo: function () {
			throw new Error("Override this method!");
		},
		/**
		 * Returns device info promise.
		 * @returns {Promise}
		 */
		getDeviceInfo: function () {
			throw new Error("Override this method!");
		},
		/**
		 * Returns network info promise.
		 * @returns {Promise}
		 */
		getNetworkInfo: function() {
			throw new Error("Override this method!");
		}
	};
}());
