Ext.namespace("Documa.distribution");

/**
 * @typedef {object} ClientGraphType
 * @property {Array.<object>} @graph
 * @property {object} @context
 */

/**
 * @typedef {object} DistributionVectorType
 * @property {Object} container
 * @property {Array} executables
 * @property {Array} nonexecutables
 * @property {Array} replaceables
 */

/**
 * @typedef {object} DeviceType
 * @property {string} sid
 * @property {ClientGraphType} client
 * @property {Array.<DeviceServiceType>} services
 */

/**
 * Class represents a runtime container executing several redistributable mashup components.
 * @class
 */
Documa.distribution.Device = Ext.extend(Object, (function() {
	const TAG = "Documa.distribution.Device";
	
	/**
	 * Helper method to validate given distribution target descriptor.
	 * @param {ClientGraphType} graph distribution target descriptor object
	 */
	function validateDescriptor(graph) {
		if(!(graph && graph["@context"] && graph["@graph"]))
			throw new Error("Invalid device graph detected!");
	}
	
	/**
	 * Queries device graph from current client graph.
	 * @returns {Promise}
	 */
	function queryDevice() {
		let frame = {
			"@context": Documa.RuntimeManager.getRuntimeContext().getPrefixMap(),
			"@graph": [{
				"@embed": "@always",
				"@type": "soft:CSRClient",
				"soft:executedBy": {
					"@embed": "@always",
					"@type": "dev:Device"
				}
			}]
		};
		let self = this;
		return new Promise(function(fulfill, reject) {
			try {
				jsonld.frame(self._clientGraph, frame, function(err, framed) {
					if(err) reject(err);
					// get csr client object
					let client = framed["@graph"][0];
					if(!client["soft:executedBy"])
						reject(new Error("Could not get device from client graph!"));
					fulfill(client["soft:executedBy"]);
				});
			} catch (error) {
				reject(error);
			}
		});
	}
	
	/**
	 * Queries runtime graph from current client graph.
	 *
	 * @param {String} [sid] optional session id
	 * @returns {Promise}
	 */
	function queryRuntime(sid = null) {
		let frame = {
			"@context": Documa.RuntimeManager.getRuntimeContext().getPrefixMap(),
			"@graph": [{
				"@embed": "@always",
				"@type": "soft:CSRClient"
			}]
		};
		let self = this;
		return new Promise(function(fulfill, reject) {
			try {
				jsonld.frame(self._clientGraph, frame, function(err, framed) {
					if(err) reject(err);
					// get csr client object
					let client = framed["@graph"][0];
					if(!client)
						reject(new Error("Could not get runtime from client graph!"));
					if(sid) {
						// given session id is valid -> update session id
						client["soft:hasSessionId"] = sid;
					}
					fulfill(client);
				});
			} catch (error) {
				reject(error);
			}
		});
	}
	
	/**
	 * Queries os graph from current client graph.
	 * @returns {Promise}
	 */
	function queryOS() {
		let frame = {
			"@context": Documa.RuntimeManager.getRuntimeContext().getPrefixMap(),
			"@graph": [{
				"@embed": "@always",
				"@type": "soft:CSRClient",
				"soft:executedBy": {
					"@embed": "@always",
					"@type": "dev:Device",
					"dev:currentOperatingSystem": {
						"@embed": "@always",
						"@type": "soft:OperatingSystem"
					}
				}
			}]
		};
		let self = this;
		return new Promise(function(fulfill, reject) {
			try {
				jsonld.frame(self._clientGraph, frame, function(err, framed) {
					if(err) reject(err);
					// get csr client object
					let client = framed["@graph"][0];
					if(!client["soft:executedBy"]["dev:currentOperatingSystem"])
						reject(new Error("Could not get operating system from client graph!"));
					fulfill(client["soft:executedBy"]["dev:currentOperatingSystem"]);
				});
			} catch (error) {
				reject(error);
			}
		});
	}
	
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {ClientGraphType} graph device profile graph
		 * @param {String} [sid=null] session id
		 */
		constructor: function(graph, sid = null) {
			validateDescriptor(graph);
			/**
			 * This registry is used for fast device service access.
			 * @type {Object.<string, Documa.deviceservices.DeviceService>}
			 * @private
			 */
			this._deviceServiceRegistry = {};
			
			/**
			 * @type {String}
			 * @private
			 */
			this._sid = sid;
			
			/**
			 * @type {object}
			 * @private
			 */
			this._clientGraph = graph;
			this._client = {
				runtime: null,
				device: null,
				os: null
			};
		},
		
		/**
		 * Destructor.
		 */
		release: function() {
			let self = this;
			// remove all service entries from current device instance
			Object.keys(this._deviceServiceRegistry).forEach(function(key) {
				self._deviceServiceRegistry[key].release();
				delete self._deviceServiceRegistry[key];
			});
			delete this._deviceServiceRegistry;
			delete this._clientGraph;
			delete this._client;
		},
		
		/**
		 * Loads the device descriptor.
		 * @returns {Promise}
		 */
		initialize: function() {
			let self = this;
			return queryDevice.call(this).then((device) => {
				self._client.device = device;
				if(this._sid) {
					return queryRuntime.call(self, self._sid);
				} else {
					return queryRuntime.call(self);
				}
			}).then(function(runtime) {
				self._client.runtime = runtime;
				return queryOS.call(self);
			}).then(function(os) {
				self._client.os = os;
				if(!self._sid) self._sid = self.getSessionId();
				return self;
			}).catch(function(error) {
				_log.error(TAG, "Error during device descriptor init: " + error.stack);
			});
		},
		
		/**
		 * Returns flag that represent of this device represents the current runtime container.
		 * @returns {boolean}
		 */
		isCurrent: function() {
			let current_sessionid = Documa.RuntimeManager.getCommunicationManager().getClientID();
			return (current_sessionid === this.getSessionId());
		},
		
		/**
		 * Sessionid providing promise.
		 * @returns {String}
		 */
		getSessionId: function() {
			return this._client.runtime["soft:hasSessionId"];
		},
		
		/**
		 * @returns {String}
		 */
		getDeviceName: function() {
			return this._client.device["com:hasName"];
		},
		
		/**
		 * @returns {String}
		 */
		getRuntimeName: function() {
			return this._client.runtime["com:hasName"];
		},
		
		/**
		 * @returns {String}
		 */
		getRuntimeVersion: function() {
			return this._client.runtime["com:hasVersion"];
		},
		
		/**
		 * @returns {String}
		 */
		getDeviceModelName: function() {
			return this._client.device["com:hasModelName"];
		},
		
		/**
		 * @returns {String}
		 */
		getUserId: function() {
			return this._client.runtime["com:hasCurrentUser"];
		},
		
		/**
		 * @returns {String}
		 */
		getDevicePicture: function() {
			return this._client.device["com:hasDevicePicture"]["@value"];
		},
		
		/**
		 * @returns {String}
		 */
		getVendorName: function() {
			return this._client.device["com:hasVendor"];
		},
		
		/**
		 * @returns {String}
		 */
		getOSName: function() {
			return this._client.os["com:hasName"];
		},
		
		/**
		 * Creates an association between this device and its service.
		 * @param {Documa.deviceservices.DeviceService} service
		 */
		addDeviceService: function(service) {
			this._deviceServiceRegistry[service.getId()] = service;
		},
		
		/**
		 * Returns the device service specified by the given identifier.
		 * @param {String} id
		 * @returns {Documa.deviceservices.DeviceService}
		 */
		getDeviceService: function(id) {
			return this._deviceServiceRegistry[id];
		},
		
		/**
		 * Array of device service interface descriptor identifier.
		 * @returns {Array.<Documa.deviceservices.DeviceService>}
		 */
		getDeviceServices: function() {
			let self = this;
			/** @type {Array.<Documa.deviceservices.DeviceService>} */
			let services = [];
			Object.keys(this._deviceServiceRegistry).forEach(function(id) {
				services.push(self._deviceServiceRegistry[id]);
			});
			return services;
		}
	};
})());
