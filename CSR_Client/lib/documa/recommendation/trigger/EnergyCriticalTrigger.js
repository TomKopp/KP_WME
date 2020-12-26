Ext.namespace("Documa.recommendation.trigger");

Documa.require("Documa.util.Logger");
Documa.require("Documa.recommendation.trigger.ClientsideTrigger");
Documa.require("Documa.components.ComponentMessage");
Documa.require("Documa.distribution.migration.options.MigrationOption");

/**
 * @class
 * @extends {Documa.recommendation.trigger.ClientsideTrigger}
 */
Documa.recommendation.trigger.EnergyCriticalTrigger = Ext.extend(Documa.recommendation.trigger.ClientsideTrigger, function() {
	const TAG = "Documa.recommendation.trigger.EnergyCriticalTrigger";
	const LOG = Documa.util.Logger;
	const CONSTANTS = {
		MIN_ENERGY_THRSH: 0.2,
		CRITICAL_DEVICES: "criticalDevices",
		BATTERY_LOW: "batterylow",
		ENERGY_LVL: "level"
	};
	/////////////////////
	// private methods //
	/////////////////////
	
	/**
	 * Helper method creating the energy critical event.
	 * @returns {Documa.components.ComponentMessage}
	 */
	function createEnergyCriticalEvent() {
		let criticalMessage = new Documa.components.ComponentMessage();
		criticalMessage.setName(CONSTANTS.BATTERY_LOW);
		criticalMessage.appendToBody(CONSTANTS.ENERGY_LVL, -1);
		return criticalMessage;
	}
	
	/**
	 * Returns a collection of migration options represented by given response payload.
	 * @param {{options: Array.<Documa.distribution.migration.options.MigrationOptionType>}} responseData
	 * @returns {Array.<Documa.distribution.migration.options.MigrationOption>}
	 */
	function getMigrationOptions(responseData) {
		/** @type {Array.<Documa.distribution.migration.options.MigrationOption>} */
		let results = [];
		for(let option of responseData.options) {
			results.push(new Documa.distribution.migration.options.MigrationOption(option));
		}
		return results;
	}
	
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function() {
			Documa.recommendation.trigger.EnergyCriticalTrigger.superclass.constructor.call(this);
			this._id = "energyCriticalTrigger";
			let startEvent = createEnergyCriticalEvent.call(this);
			this.fillStartEvents([startEvent]);
		},
		
		/**
		 * Evaluate the amount of available energy level specified as part of the context event.
		 * Furthermore, validate the count of devices in a critical state, e. g. with limited energy value.
		 *
		 * @override
		 * @param {Documa.components.ComponentMessage} contextEvent
		 * @returns {Promise.<Boolean>}
		 */
		checkCondition: function(contextEvent) {
			// TODO: just a dummy implementation for testing purpose
			return new Promise((fulfill, reject)=> {
				fulfill(true);
			});
		},
		
		/**
		 * @override
		 * @param {Documa.components.ComponentMessage} contextEvent
		 * @returns {Promise}
		 */
		requestRecommendations: function(contextEvent) {
			let cid = Documa.RuntimeManager.getCommunicationManager().getClientID();
			return this._appcontext.getDistributionManager().requestCurrentMigrationOptions(cid);
		}
	};
}());