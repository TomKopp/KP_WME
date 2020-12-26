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
Documa.context.DesktopRuntimeContext = Ext.extend(Documa.context.RuntimeContext, (function () {
	const TAG = "Documa.context.DesktopRuntimeContext";
	const LOG = Documa.util.Logger;
	const UTIL = Documa.util.Util;
	const DESKTOP_DESCR_PATH = "res/descriptor/platform-desktop.owl";
	const DESKTOP_NS = "http://mmt.inf.tu-dresden.de/documa/ontologies/platform-desktop#";
	const DESKTOP_INDIVIDUAL = DESKTOP_NS + "DesktopPC_Windows";
	const CSR_INDIVIDUAL = DESKTOP_NS + "CSR_DesktopClient";

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function () {
			Documa.context.DesktopRuntimeContext.superclass.constructor.call(this);
			this._parser = new UAParser();
			var self = this;
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(function (position) {
					self._location = position;
				});
			} else {
				this._location = null;
			}
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
				var loaded = function (rt) {
					LOG.debug(TAG, "... runtime descriptor loaded successfully!");

					// setting value of runtime descriptor attribute
					self.setAttribute(Documa.context.CONTEXT_ATTR_NAMES.RUNTIME_DESCR_OWL, rt);
					callback(self);
				};
				if (Documa.isNodeWebkit()) {
					// loading runtime descriptor from local file
					UTIL.loadDescriptor(DESKTOP_DESCR_PATH, false, loaded);
				} else {
					// loading runtime descriptor from remote webserver
					UTIL.loadDescriptor(DESKTOP_DESCR_PATH, true, loaded);
				}
			} catch (error) {
				LOG.error(TAG, error);
			}
		},

		/**
		 * Method to individualize the given client runtime descriptor.
		 *
		 * @param {String} descriptor client runtime descriptor to individualize
		 */
		individualizeDescriptor: function(descriptor){
			return Documa.context.DesktopRuntimeContext.superclass
				.individualizeDescriptor(descriptor, DESKTOP_INDIVIDUAL, CSR_INDIVIDUAL);
		},

		/**
		 * Returns battery info promise.
		 * @returns {Promise}
		 */
		getBatteryInfo: function () {
			var battery = navigator.battery || navigator.webkitBattery;
			return new Promise(function (resolve, reject) {
				if (!battery) {
					resolve({
						level: battery.level,
						plugged: battery.charging
					});
				}
				reject('No battery reader available');
			});
		},

		/**
		 * Returns device info promise.
		 * @returns {Promise}
		 */
		getDeviceInfo: function () {
			var browser, device, engine, os, cpu;
			var latitude, longitude;
			var self = this;
			return new Promise(function (resolve, reject) {
				if (!self._parser) {
					reject('No parser available');
				} else {
					if (self._location !== null) {
						latitude = self._location.coords.latitude;
						longitude = self._location.coords.longitude;
					}
					browser = self._parser.getBrowser();
					device = self._parser.getDevice();
					engine = self._parser.getEngine();
					os = self._parser.getOS();
					cpu = self._parser.getCPU();
					resolve({
						browser_name: browser.name || '',
						browser_major: browser.major || '',
						browser_version: browser.version || '',
						device_model: device.model || '',
						device_type: device.type || '',
						device_vendor: device.vendor || '',
						engine_name: engine.name || '',
						engine_version: engine.version || '',
						os_name: os.name || '',
						os_version: os.version || '',
						cpu: cpu.architecture || '',
						latitude: latitude || null,
						longitude: longitude || null
					});
				}
			});
		}
	};
})()); 