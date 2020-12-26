Ext.namespace("Documa.discovery.reader");

Documa.require("Documa.util.Logger");
Documa.require("Documa.discovery.reader.DeviceReader");

/**
 * Class reading the device features and properties.
 * @class
 */
Documa.discovery.reader.DesktopDeviceReader = Ext.extend(Documa.discovery.reader.DeviceReader, function () {
	var TAG = 'Documa.discovery.reader.DesktopDeviceReader';
	var _log = Documa.util.Logger;

	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function () {
			Documa.discovery.reader.DesktopDeviceReader.superclass.constructor.call(this);
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
						longitude: longitude || null,
					});
				}
			});
		}
	};
}());
