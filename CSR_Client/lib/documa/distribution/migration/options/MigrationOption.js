Ext.namespace("Documa.distribution.migration.options");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");
Documa.require("Documa.util.EventUtil");
Documa.require("Documa.distribution.migration.options.MigrationCause");
Documa.require("Documa.distribution.migration.options.MigrationEffect");

/**
 * @typedef {object} Documa.distribution.migration.options.MigrationOptionType
 * @property {String} id
 * @property {String} sourceDevice
 * @property {Array.<Documa.distribution.DistributionOptionsVectorType>} distributions
 * @property {Array.<Documa.distribution.migration.options.MigrationEffectType>} effects
 * @property {Documa.distribution.migration.options.MigrationCauseType} cause
 */


/**
 * @class
 */
Documa.distribution.migration.options.MigrationOption = Ext.extend(Object, function(){
	const TAG = "Documa.distribution.migration.options.MigrationOption";
	const LOG = Documa.util.Logger;
	const test = Documa.util.Util.test;
	const EVENTUTIL = Documa.util.EventUtil;
	/////////////////////
	// private methods //
	/////////////////////

	/**
	 *
	 * @type {Documa.distribution.DistributionManager}
	 * @private
	 */
	let _distributionManager = null;

	/**
	 * Factory method returns an array of migration effects.
	 *
	 * @param {Array.<Documa.distribution.migration.options.MigrationEffectType>} effects
	 * @returns {Array.<Documa.distribution.migration.options.MigrationEffect>}
	 */
	function getEffects(effects){
		/** @type {Array.<Documa.distribution.migration.options.MigrationEffect>} */
		let results = [];
		for(let eff of effects) {
			test("value", eff);
			test("unit", eff);
			test("target", eff);
			results.push(new Documa.distribution.migration.options.MigrationEffect(eff.value, eff.unit, eff.target))
		}
		return results;
	}

	/**
	 * Factory method returns an array of distribution option vectors (containing executable and
	 * replaceable component descriptors).
	 *
	 * @param {Array.<Documa.distribution.DistributionOptionsVectorType>} distributions
	 * @returns {Array.<Documa.distribution.DistributionOptionsVector>}
	 */
	function getVectors(distributions){
		/** @type {Array.<Documa.distribution.DistributionOptionsVector>} */
		let results = [];
		for(let dv of distributions) {
			results.push(EVENTUTIL.getDistributionOptionsVectorFromRecommendation(dv));
		}
		return results;
	}

	/**
	 * Factory method returns an object describing the migration cause, i.e. the corresponding context event
	 * and its context source.
	 *
	 * @param {Documa.distribution.migration.options.MigrationCauseType} valueObj
	 * @returns {Documa.distribution.migration.options.MigrationCause}
	 */
	function getCause(valueObj){
		test("cause", valueObj);
		test("source", valueObj);
		return new Documa.distribution.migration.options.MigrationCause(valueObj.cause, valueObj.source);
	}

	/**
	 * @param {Array.<Documa.distribution.DistributionOptionsVector>} devs
	 * @returns {Array.<Documa.distribution.Device>}
	 */
	function getTargetDevices(devs){
		return devs.map((vector) =>{
			let d = vector.getDevice();
			if(!d) throw new Error(`Could not get device with session id ${sid}`);
			return d;
		});
	}


	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {Documa.distribution.migration.options.MigrationOptionType} payload
		 */
		constructor: function(payload){
			Documa.distribution.migration.options.MigrationOption.superclass.constructor.call(this);
			// test payload structure
			test("id", payload);
			test("sourceDevice", payload);
			test("distributions", payload);
			test("effects", payload);
			test("cause", payload);

			_distributionManager = Documa.RuntimeManager.getApplicationContext().getDistributionManager();

			this._id = payload.id;
			this._srcClient = _distributionManager.getDevice(payload.sourceDevice);
			this._distributions = getVectors(payload.distributions);
			this._targetDevices = getTargetDevices(this._distributions);
			this._cause = getCause(payload.cause);
			this._effects = getEffects(payload.effects);
			this._serial = payload;
		},

		/**
		 * @returns {String}
		 */
		getId: function(){
			return this._id;
		},

		/**
		 * @returns {Documa.distribution.migration.options.MigrationCause}
		 */
		getCause: function(){
			return this._cause;
		},

		/**
		 * @returns {Array.<Documa.distribution.DistributionOptionsVector>}
		 */
		getDistributionOptions: function(){
			return this._distributions;
		},

		/**
		 *
		 * @param {String} deviceId
		 * @returns {Documa.distribution.DistributionOptionsVector | boolean}
		 */
		getDistributionOption: function(deviceId){
			for(let key in this._distributions) {
				if(this._distributions.hasOwnProperty(key)) {
					if(this._distributions[key].getDevice().getSessionId() == deviceId) {
						return this._distributions[key];
					}
				}
			}
			return false;
		},

		/**
		 * @returns {Array.<Documa.distribution.migration.options.MigrationEffect>}
		 */
		getMigrationEffects: function(){
			//return this._effects;
			return this._effects.sort(function(a,b) {return (a.getEffectTarget() > b.getEffectTarget()) ? 1 : ((b.getEffectTarget() > a.getEffectTarget()) ? -1 : 0);});
		},

		/**
		 * @returns {Documa.distribution.Device}
		 */
		getSourceDevice: function(){
			return this._srcClient;
		},

		/**
		 * Returns this migration option as serializable object, e.g. for stringifying this object
		 * in JSON format.
		 *
		 * @returns {Documa.distribution.migration.options.MigrationOptionType}
		 */
		serialize: function(){
			return this._serial;
		}
	};
}());