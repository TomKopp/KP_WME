/**
 * @author Oliver Mross
 */
Ext.namespace('Documa.context');

Documa.require('Documa.util.Util');
Documa.require('Documa.util.Logger');
Documa.require('Documa.context.RuntimeContext');

/**
 * Class providing access to the device runtime context.
 *
 * @class
 * @extends {Documa.context.RuntimeContext}
 */
Documa.context.SmartphoneRuntimeContext = Ext.extend(Documa.context.RuntimeContext, (function () {
	const TAG = "Documa.context.SmartphoneRuntimeContext";
	const UTIL = Documa.util.Util;
	const LOG = Documa.util.Logger;
	const SMARTHONE_DESCR_PATH = "res/descriptor/platform-smartphone.owl";
	const SMARTPHONE_NS = "http://mmt.inf.tu-dresden.de/documa/ontologies/platform-smartphone#";
	const SMARTPHONE_INDIVIDUAL = SMARTPHONE_NS + "LG_P970";
	const CSR_INDIVIDUAL = SMARTPHONE_NS + "MobileClient_CSR";
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function () {
			Documa.context.SmartphoneRuntimeContext.superclass.constructor.call(this);
			this._deviceReady = new Promise(function (resolve, reject) {
				document.addEventListener('deviceready', resolve, false);
				/* EventListener has no error handling. Reject the promise after 60 seconds */
				//setTimeout(function () {
				//  reject('deviceready-event has not been fired after 60 seconds.');
				//}, 60000);
			});
		},

		/**
		 * Triggers the loading of the runtime descriptor file.
		 *
		 * @param {Function} callback function to call after the runtime context object was
		 * initialized successfully.
		 */
		initialize: function (callback) {
			try {
				var self = this;
				UTIL.loadDescriptor(SMARTHONE_DESCR_PATH, true, function (rt) {
					LOG.debug(TAG, "... runtime descriptor loaded successfully!");
					
					// setting value of runtime descriptor attribute
					self.setAttribute(Documa.context.CONTEXT_ATTR_NAMES.RUNTIME_DESCR_OWL, rt);
					callback(self);
				});
			} catch (error) {
				LOG.error(TAG, error);
			}
		},
		
		/**
		 * Method to individualize the given client runtime descriptor.
		 *
		 * @param {DOMElement} descriptor client runtime descriptor to individualize
		 */
		individualizeDescriptor: function (descriptor) {
			return Documa.context.SmartphoneRuntimeContext.superclass
				.individualizeDescriptor(descriptor, SMARTPHONE_INDIVIDUAL, CSR_INDIVIDUAL);
		},

		/**
		 * @returns {Promise}
		 */
		getDeviceInfo: function () {
			var self = this;
			return new Promise(function (resolve, reject) {
				self._deviceReady.then(function () {
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
			var self = this;
			return new Promise(function (resolve, reject) {
				self._deviceReady.then(function () {
					//resolve({
					//	connection: _networkState()
					//});
					throw new Error("Not implemented yet!");
				}, reject);
			});
		},
		/**
		 * @returns {Promise}
		 */
		getBatteryInfo: function () {
			var self = this;
			return new Promise(function (resolve, reject) {
				self._deviceReady.then(function () {
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
		}
	};
})());

