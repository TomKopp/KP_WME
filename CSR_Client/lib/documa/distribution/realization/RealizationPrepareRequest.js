Ext.namespace("Documa.distribution.realization");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.DistributionModification");
Documa.require("Documa.distribution.realization.Realization");
Documa.require("Documa.distribution.ComponentItem");
Documa.require("Documa.components.ComponentInterface");

Documa.distribution.realization.RealizationRoles = {
	Source: "source",
	Target: "target"
};

/**
 * @typedef {object} RealizationType
 * @property {string} id
 * @property {string} initiator
 * @property {Array.<DistributionModificationType>} modifications
 */

/**
 * @typedef {object} RealizationPrepareParams
 * @property {string} rrole
 * @property {RealizationType} realization
 */


/**
 * This class represents the distribution realization request during the dynamic creation of a multi-device mashup.
 * @class
 */
Documa.distribution.realization.RealizationPrepareRequest = Ext.extend(Object, function(){
	var TAG = "Documa.distribution.realization.RealizationPrepareRequest";
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
	 * @param {RealizationCommitParams} params
	 * @returns {Documa.distribution.DistributionModification[]}
	 */
	function getModifications(params){
		/** @type {Array.<Documa.distribution.DistributionModification>} */
		var results = [];
		params.realization.modifications.forEach(function(mod){
			var components = [];
			mod.components.forEach(function(c){
				var citem = new Documa.distribution.ComponentItem({id: c.instance, cid: c.component});
				components.push(citem);
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
		 *
		 * @param {Documa.context.ApplicationContext} appctxt
		 * @param {RealizationPrepareParams} params
		 */
		constructor: function(appctxt, params){
			validateRequestParameters(params);
			/**
			 * Current application context.
			 * @type {Documa.context.ApplicationContext}
			 * @private
			 */
			this._appctxt = appctxt;

			/**
			 * Session id of initiator device.
			 * @type {String}
			 * @private
			 */
			this._initiator = params.realization.initiator;

			/**
			 * @type {Documa.distribution.realization.Realization}
			 * @private
			 */
			this._realization = new Documa.distribution.realization.Realization(
				params.realization.id, this._initiator, appctxt, getModifications(params));

			/**
			 * determine current runtime's role considering this realization request
			 * @type {string}
			 * @private
			 */
			this._runtimeRole = params.rrole;
		},

		/**
		 * Returns initiator's session id.
		 * @returns {String}
		 */
		getInitiator: function(){
			return this._initiator;
		},

		/**
		 * @returns {Array.<String>}
		 */
		getTargetSessions: function(){
			/**
			 * @type {Array.<String>}
			 */
			var resultSet = [];
			this._realization.getModifications().forEach(function(mod){
				resultSet.push(mod.getTarget());
			});
			return resultSet;
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