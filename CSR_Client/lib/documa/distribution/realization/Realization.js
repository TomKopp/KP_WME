Ext.namespace("Documa.distribution.realization");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.transaction.DistributedTransaction");

/**
 * @class
 * @extends {Documa.distribution.transaction.DistributedTransaction}
 */
Documa.distribution.realization.Realization = Ext.extend(Documa.distribution.transaction.DistributedTransaction, function(){
	const TAG = "Documa.distribution.realization.Realization";
	const LOG = Documa.util.Logger;
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {string} id
		 * @param {string} initiator
		 * @param {Documa.context.ApplicationContext} appctxt
		 * @param {Array.<Documa.distribution.DistributionModification>} modifications
		 */
		constructor: function(id, initiator, appctxt, modifications){
			Documa.distribution.realization.Realization.superclass.constructor.call(this, id, appctxt, initiator);
			this._modifications = modifications;
		},

		/**
		 * @param {Documa.distribution.Device} device
		 * @returns {Documa.distribution.DistributionModification}
		 */
		getModificationFrom: function(device){
			for (let i = 0; i < this._modifications.length; ++i){
				if (this._modifications[i].getTarget() === device.getSessionId())
					return this._modifications[i];
			}
			return null;
		},

		/**
		 * Returns this distribution state realization in flat and serializable object notation.
		 * @returns {{initiator:string, modifications:Array.<object>}}
		 */
		serialize: function(){
			let mods = [];
			this._modifications.forEach(function(mod){
				mods.push(mod.serializable());
			});
			return {
				id: this._id,
				initiator: this._initiator,
				modifications: mods
			};
		}
	};
}());