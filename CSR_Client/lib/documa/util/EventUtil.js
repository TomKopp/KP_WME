Ext.namespace("Documa.util");

Documa.require("Documa.util.Util");
Documa.require("Documa.distribution.Device");
Documa.require("Documa.collaboration.user.Participant");
Documa.require("Documa.distribution.DistributionVectorItems");
Documa.require("Documa.distribution.DistributionOptionsVector");

Documa.util.EventUtil = (function(){
	const test = Documa.util.Util.test;
	
	// **************************************************
	// private space ************************************
	function validateJoinInitiator(payload){
		if (!payload.initr)
			throw new Error("No initiator element in application lifecycle event defined!");
		if (!payload.initr.user)
			throw new Error("No user descriptor in initiator object defined!");
		if (!payload.initr.device)
			throw new Error("No device descriptor in initiator object defined!");
	}

	/**
	 * @param {JoinedPaylod} payload
	 */
	function validateJoinClient(payload){
		if (!payload.jclient)
			throw new Error("No descriptor of joined client defined in event payload!");
		if (!payload.jclient.user)
			throw new Error("No user descriptor of joined client defined in event payload!");
		if (!payload.jclient.device)
			throw new Error("No device descriptor of joined client defined in event payload!");
	}
	
	
	/**
	 * @param {Documa.distribution.DVComponentItemType} valueObj
	 * @returns {Documa.distribution.DVComponentItem}
	 */
	function getDVComponentItem(valueObj){
		test("component", valueObj);
		test("features", valueObj);
		return new Documa.distribution.DVComponentItem(valueObj);
	}
	
	/**
	 * @param {Documa.distribution.DVReplacementItemType} valueObj
	 */
	function getDVReplacementItem(valueObj){
		test("component", valueObj);
		test("mappings", valueObj);
		return new Documa.distribution.DVReplacementItem(valueObj);
	}

	// eof private space ********************************
	// **************************************************
	// public space *************************************
	return {
		/**
		 * Returns session id of application's initiator defined in given application lifecycle event.
		 *
		 * @param {Object} applfevent application lifecycle event
		 */
		getInitiatorIdFromJoinPayload: function(payload){
			validateJoinInitiator(payload);
			return payload.initr.user.sid;
		},

		/**
		 * Returns initiator's session (user) descriptor form specified join event payload.
		 *
		 * @param {JoinedPaylod|JoinedResponsePayload} payload join event payload
		 * @returns {Documa.collaboration.user.Participant} user descriptor instance
		 */
		getInitiatorFromJoinPayload: function(payload){
			validateJoinInitiator(payload);
			return new Documa.collaboration.user.Participant(payload.initr.user, true);
		},

		/**
		 * Returns initiator's device descriptor from specified join event payload.
		 *
		 * @param {JoinedPaylod|JoinedResponsePayload} payload join event payload
		 * @returns {Promise}
		 */
		getInitiatorDeviceFromJoinPayload: function(payload){
			validateJoinInitiator(payload);
			let d = new Documa.distribution.Device(payload.initr.device.client);
			let device = Documa.RuntimeManager.getEnvironmentContext().getDevice(payload.initr.device.sid);
			if (!device) throw new Error("Could not get initiator device during join event!");
			return device;
		},

		/**
		 * Returns joined client device descriptor.
		 *
		 * @param {JoinedPaylod|JoinedResponsePayload} payload join event payload
		 * @returns {Promise}
		 */
		getDeviceFromJoinPayload: function(payload){
			validateJoinClient(payload);
			let environment = Documa.RuntimeManager.getEnvironmentContext();
			let device = environment.getDevice(payload.jclient.device.sid);
			return new Promise(function(fulfill, reject){
				if (device) {
					fulfill(device);
				} else {
					environment.wasAdded(payload.jclient.device.sid).then(function(){
						let device = environment.getDevice(payload.jclient.device.sid);
						if (!device) reject(new Error("Could not get device " + payload.jclient.device.sid));
						fulfill(device);
					}).catch(function(error){
						reject(error)
					});
				}
			});
		},

		/**
		 * Returns user session id as string.
		 *
		 * @param {JoinedPaylod|JoinedResponsePayload} payload payload of join event
		 * @returns {String} user's session id
		 */
		getUserIdFromJoinPayload: function(payload){
			validateJoinClient(payload);
			return payload.jclient.user.sid;
		},

		/**
		 * Returns user descriptor object.
		 *
		 * @param {JoinedPaylod|JoinedResponsePayload} payload payload of join event
		 * @param {boolean} isInitiator flag indicating the application owner status
		 * @returns {Documa.collaboration.user.Participant} user descriptor instance
		 */
		getUserFromJoinPayload: function(payload, isInitiator){
			validateJoinClient(payload);
			return new Documa.collaboration.user.Participant(payload.jclient.user, isInitiator);
		},

		/**
		 * Returns distribution options specified as part of given payload object.
		 *
		 * @param {Documa.distribution.Device} device
		 * @param {JoinedPaylod|JoinedResponsePayload} payload
		 * @returns {Documa.distribution.DistributionOptionsVector}
		 */
		getDistributionOptionsFromJoinPayload: function(device, payload){
			if (!payload.jclient.dvect)
				throw new Error("Invalid client join event payload! Missing distribution vector");
			// TODO: create distribution option vector from given payload
			// device, execs, nonexecs, replaceables
			let vpl = payload.jclient.dvect;
			// TODO: get device instance from payload object
			// TODO: get set of executable component items from payload object
			// TODO: get set of non-executable component items from payload object
			// TODO: get set of replacement items from payload object
			//let executables = vpl.
			throw new Error("Not implemented yet!");
		},
		
		/**
		 * Returns a distribution options vector from given payload.
		 *
		 * @param {Documa.distribution.DistributionOptionsVectorType} payload
		 */
		getDistributionOptionsVectorFromRecommendation: function(payload){
			test("container", payload);
			test("executables", payload);
			test("nonexecutables", payload);
			test("replaceables", payload);
			let client = Documa.RuntimeManager.getEnvironmentContext().getDevice(payload.container);
			if(!client) throw new Error(`Could not retrieve device from session id ${payload.container}`);
			
			/** @type {Array.<Documa.distribution.DVComponentItem>} */
			let execs = [];
			for(let exec of payload.executables) {
				execs.push(getDVComponentItem(exec));
			}
			/** @type {Array.<Documa.distribution.DVReplacementItem>} */
			let replacbls = [];
			payload.replaceables.forEach((r) =>{
				replacbls.push(getDVReplacementItem(r));
			});
			return new Documa.distribution.DistributionOptionsVector(client, execs, [], replacbls);
		}

	};
	// eof public space *********************************
})();
