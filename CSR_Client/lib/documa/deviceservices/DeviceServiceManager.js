Ext.namespace("Documa.deviceservices");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");
Documa.require("Documa.deviceservices.DeviceService");


/**
 * @typedef {Object} DeviceServiceDescriptor
 * @property {String} id
 * @property {String} dsid
 * @property {String} interface
 */

/**
 * @typedef {Object} Descriptor
 * @property {DeviceType} client
 * @property {Array.<DeviceServiceDescriptor>} services
 */

/**
 * Object managing all visible device services.
 * @class
 */
Documa.deviceservices.DeviceServiceManager = Ext.extend(Object, function(){
	var TAG = "Documa.deviceservices.DeviceServiceManager";
	var _log = Documa.util.Logger;
	var _util = Documa.util.Util;
	var jq = jQuery;
	/////////////////////
	// private methods //
	/////////////////////

	/* TODO: add here your private methods */
	function validateDeviceServiceDescriptor(descriptor){
		var test = _util.test;
		test("id", descriptor);
		test("dsid", descriptor);
		test("interface", descriptor);
	}

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function(){
			/**
			 * Registry of current device services.
			 * @type {Object.<string, Documa.deviceservices.DeviceService>}
			 * @private
			 */
			this._services = {};
		},

		/**
		 * Loads and registers a device service instance.
		 *
		 * @param {DeviceServiceDescriptor} deviceServiceDescr
		 */
		loadDeviceService: function(deviceServiceDescr){
			validateDeviceServiceDescriptor(deviceServiceDescr);
			var interfaceDoc = jq.parseXML(deviceServiceDescr.interface);
			/** @type {jQuery} */
			var dsdoc = jq(interfaceDoc);
			this.registerService(deviceServiceDescr.id, deviceServiceDescr.dsid, dsdoc);
		},

		/**
		 * Registers a device service component.
		 * @param {String} dsid device service identifier
		 * @param {String} sid host device's identifier
		 * @param {jQuery} document interface description in smcdl format
		 */
		registerService: function(dsid, sid, document){
			if (this._services[dsid]) {
				throw new Error("Device service with id " + dsid + " already registered!");
			}
			// register device service
			this._services[dsid] = new Documa.deviceservices.DeviceService(dsid, sid, document);
		},

		/**
		 * Removes registered device service.
		 * @param {String} dsid device service identifier
		 */
		removeService: function(dsid){
			if (!this._services[dsid])
				throw new Error("Device service " + dsid + " is not registered!");

			delete this._services[dsid];
		},

		/**
		 * Returns a device service using its identifier.
		 *
		 * @param {String} id device service identifier
		 * @returns {Documa.deviceservices.DeviceService}
		 */
		getService: function(id){
			return this._services[id];
		},

		/**
		 * Returns all services from current device.
		 * @param {Documa.distribution.Device} device
		 */
		getServices: function(device){
			throw new Error("Not implemented yet!");
		}
	};
}());