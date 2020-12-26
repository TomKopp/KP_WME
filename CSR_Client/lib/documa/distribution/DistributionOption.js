Ext.namespace('Documa.distribution');

Documa.require('Documa.distribution.Device');

/**
 * @class
 */
Documa.distribution.DistributionOption = Ext.extend(Object, (function() {

	function validatePayload(payload) {
		if (!payload.distid) {
			throw new Error("Could not find distribution id!");
		}

		if (!payload.choiceset) {
			throw new Error("Could not find set of potential distribution targets");
		}
	}

	/**
	 * Helper method to fill set of runtime targets
	 *
	 * @param {Array} targetArray array containing distribution target descriptor
	 * objects
	 */
	function fillRuntimeTargets(targetArray) {
		let env = Documa.RuntimeManager.getEnvironmentContext();
		for(let choiceItem of targetArray){
			if(!env.containsDevice(choiceItem.sid))
				throw new Error(`Missing device with session id: ${choiceItem.sid}`);

			let targetObj = env.getDevice(choiceItem.sid);
			this._runtimeTargets[targetObj.getSessionId()] = targetObj;
		}
	}

	/**
	 * Helper method to fill up all component descriptions of a distribution object.
	 *
	 * @param {Array} componentsArray array of component items containing name and
	 * component-id (not instance-id)
	 */
	function fillComponents(componentsArray) {
		for (let i = 0; i < componentsArray.length; ++i) {
			this._componentObjs.push({
				name : componentsArray[i].cname,
				cid : componentsArray[i].cid,
				instid: componentsArray[i].instid
			});
		}
	}

	return {
		constructor : function(payload) {
			// validate structure of given payload object
			validatePayload(payload);

			this._id = payload.distid;
			this._runtimeTargets = {};
			this._componentObjs = [];
			fillRuntimeTargets.call(this, payload.choiceset);
			fillComponents.call(this, payload.cmpset);
		},

		/**
		 * Returns distribution id.
		 */
		getId : function() {
			return this._id;
		},

		/**
		 * Returns set of potential runtime targets.
		 *
		 * @return set of runtime target items as
		 * {Documa.distribution.Device}
		 */
		getRuntimeTargetSet : function() {
			return this._runtimeTargets;
		},

		/**
		 * Returns an array of component value objects. Each object contains the
		 * components name and id.
		 *
		 * @return {Array}
		 */
		getComponentObjects : function() {
			return this._componentObjs;
		}

	};
})());
