Ext.namespace("Documa.distribution.migration.options");

Documa.require("Documa.util.Logger");

/**
 * @typedef {Object} Documa.distribution.migration.options.UnitType
 * @property {String} name
 * @property {String} symbol
 */

/**
 * @typedef {Object} Documa.distribution.migration.options.MigrationEffectType
 * @property {String} target
 * @property {String} value
 * @property {Documa.distribution.migration.options.UnitType} unit
 */

/**
 * Enumeration of migration effect targets
 * @readonly
 * @enum {String}
 */
Documa.distribution.migration.options.EffectTargets = {
	APP_LIFESPAN: "app_lifespan",
	AVG_LATENCY: "avg_latency",
	TRANSACTION_DURATION: "transaction_duration",
	AFFECTED_DEVICES: "affected_devices"
};

/**
 * @class
 */
Documa.distribution.migration.options.MigrationEffect = Ext.extend(Object, function(){
	const TAG = "Documa.distribution.migration.options.MigrationEffect";
	const LOG = Documa.util.Logger;
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {String|Number} value
		 * @param {Documa.distribution.migration.options.UnitType} unit
		 * @param {String} target
		 */
		constructor: function(value, unit, target){
			Documa.distribution.migration.options.MigrationEffect.superclass.constructor.call(this);
			this._value = value;
			this._unit = unit;
			this._target = target;
		},

		/**
		 * @returns {String|Number}
		 */
		getValue: function(){
			return this._value;
		},

		/**
		 * @returns {Documa.distribution.migration.options.UnitType}
		 */
		getUnit: function(){
			return this._unit;
		},

		/**
		 * @returns {String}
		 */
		getEffectTarget: function(){
			return this._target;
		}
	};
}());