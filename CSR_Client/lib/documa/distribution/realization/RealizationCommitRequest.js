Ext.namespace("Documa.distribution.realization");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

/**
 * @typedef {object} RealizationCommitParams
 * @property {string} rrole
 * @property {RealizationType} realization
 */

/**
 * @class
 */
Documa.distribution.realization.RealizationCommitRequest = Ext.extend(Object, function(){
	var TAG = "Documa.distribution.realization.RealizationCommitRequest";
	var _log = Documa.util.Logger;
	var _util = Documa.util.Util;
	/////////////////////
	// private methods //
	/////////////////////

	/**
	 * @param {{type:string, components:array, target:string, modid:string}} modification
	 */
	function validateModification(modification){
		var test = _util.test;
		test("type", modification);
		test("components", modification);
		test("target", modification);
		test("modid", modification);

		if (modification.type !== Documa.distribution.DistributionModificationTypes.CREATE)
			throw new Error("Invalid distribution state modification descriptor!");
	}

	/**
	 * @param {RealizationType} realization
	 */
	function validateRealization(realization){
		var test = _util.test;
		test("id", realization);
		test("modifications", realization);
		test("initiator", realization);

		realization.modifications.forEach(function(mod){
			validateModification(mod);
		});
	}


	/**
	 * @param {RealizationPrepareParams} params
	 */
	function validateRequestParameters(params){
		var test = _util.test;
		test("realization", params);
		test("rrole", params);

		validateRealization(params.realization);
	}

	/**
	 * Returns modification entities from current application context.
	 *
	 * @param {Documa.context.ApplicationContext} appctxt
	 * @param {RealizationCommitParams} params
	 * @returns {Documa.distribution.DistributionModification[]}
	 */
	function getModifications(appctxt, params){
		/** @type {Array.<Documa.distribution.DistributionModification>} */
		var results = [];
		params.realization.modifications.forEach(function(mod){
			var components = [];
			var targetDevice = appctxt.getDistributionManager().getDevice(mod.target);
			var targetDistribution = appctxt.getDistributionManager().getDistributionFromDevice(targetDevice);
			mod.components.forEach(function(c){
				if (!targetDistribution.containsComponent(c.instance, c.component))
					throw new Error("Component instance " + c.instance + " not available!");

				// get corresponding component instance from target distribution added previously during the prepare
				// phase
				var component = targetDistribution.getComponents().filter(function(citem){
					return citem.getInstanceId() === c.instance;
				})[0];
				components.push(component);
			});
			results.push(new Documa.distribution.DistributionModification(mod.modid, mod.type, components, mod.target));
		});
		return results;
	}

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {Documa.context.ApplicationContext} appctxt
		 * @param {RealizationCommitParams} params
		 */
		constructor: function(appctxt, params){
			Documa.distribution.realization.RealizationCommitRequest.superclass.constructor.call(this);
			/**
			 * @type {Documa.distribution.realization.Realization}
			 * @private
			 */
			this._realization = new Documa.distribution.realization.Realization(
				params.realization.id, this._initiator, appctxt, getModifications(appctxt, params));

			/**
			 * determine current runtime's role considering this realization request
			 * @type {string}
			 * @private
			 */
			this._runtimeRole = params.rrole;
		},

		/**
		 * Returns current runtime's role from the perspective of this request. Possible values are
		 * "source" or "target".
		 *
		 * @returns {string}
		 */
		getRuntimeRole: function(){
			return this._runtimeRole;
		},

		/**
		 * @returns {Documa.distribution.realization.Realization}
		 */
		getRealization: function(){
			return this._realization;
		}
	};
}());