Ext.namespace("Documa.context");

/**
 * This class represents the visible global environment but not the complete environment model, because some devices and
 * their services can be hidden.
 *
 * @class
 */
Documa.context.EnvironmentContext = Ext.extend(Object, function() {
	const TAG = "Documa.context.EnvironmentContext";
	const _log = Documa.util.Logger;
	
	/////////////////////
	// private methods //
	/////////////////////
	
	// TODO: add here private methods
	
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function() {
			Documa.context.EnvironmentContext.superclass.constructor.call(this);
			
			/**
			 * global device registry on client-side
			 * @type {Object.<string, Documa.distribution.Device>}
			 * @private
			 */
			this._neighborDevices = {};
			
			/**
			 * @type {object.<string, Promise>}
			 * @private
			 */
			this._addedPromises = {};
			
			/**
			 * @type {Function}
			 * @private
			 */
			this._addedCallback = null;
		},
		
		/**
		 * Registers neighbor device. Different neighbor device could be used by the same user.
		 * @param {Documa.distribution.Device} device
		 */
		addNeighborDevice: function(device) {
			_log.debug(TAG, "Registering device: " + device.getDeviceName());
			this._neighborDevices[device.getSessionId()] = device;
			//if (!this._addedPromises[device.getSessionId()]) {
			//	var p = Promise.resolve();
			//	p.fulfilled = true;
			//	this._addedPromises[device.getSessionId()] = p;
			//}
			if(this._addedCallback) this._addedCallback(device);
		},
		
		/**
		 * @param {string} sid device session id
		 * @returns {Promise}
		 */
		wasAdded: function(sid) {
			var self = this;
			var p = new Promise(function(fulfill) {
				var fn = self._addedCallback;
				self._addedCallback = function(device) {
					if(fn) fn(device);
					if(device.getSessionId() === sid) {
						fulfill();
						p.fulfilled = true;
					}
				};
			});
			return p;
		},
		
		/**
		 * Removes specified from the internal registry.
		 * @param {String} sid sessionid
		 */
		removeNeighborDevice: function(sid) {
			var device = this._neighborDevices[sid];
			if(!device)
				throw new Error("There is no device with session id: " + sid + " registered!");
			delete this._neighborDevices[sid];
			_log.debug(TAG, "Device removed: " + device.getDeviceName());
			device.release();
		},
		
		/**
		 * Returns device with specified session id
		 * @param {String} id device's session id
		 * @returns {Documa.distribution.Device}
		 */
		getDevice: function(id) {
			let result = this._neighborDevices[id];
			if(!result) {
				let host = Documa.RuntimeManager.getRuntimeContext().getDevice();
				// test of specified id is the host id
				if(host.getSessionId() === id)
					result = host;
			}
			return result;
		},
		
		/**
		 * Returns true if there are devices currently available associated with the specified participant.
		 * @param {Documa.collaboration.user.Participant} participant
		 */
		hasAvailableDevices: function(participant) {
			var sids = Object.keys(this._neighborDevices);
			for(var i = 0; i < sids.length; ++i) {
				var device = this._neighborDevices[sids[i]];
				if(device.getUserId() === participant.getUserId()) {
					// found a matching device
					return true;
				}
			}
			return false;
		},
		
		/**
		 * Test whether a device with the specified session id is element
		 * of the current environment context.
		 * @param {String} id device's session id
		 * @returns {boolean}
		 */
		containsDevice: function(id) {
			if(this._neighborDevices[id])
				return true;
			var host = Documa.RuntimeManager.getRuntimeContext().getDevice();
			return (host.getSessionId() === id);
		}
	};
}());