Ext.namespace("Documa.distribution.transaction");

Documa.require("Documa.util.Logger");

Documa.distribution.transaction.TransactionEvents = {
	PREPARING: "preparing",
	PREPARED: "prepared",
	COMPLETED: "completed",
	CANCELLED: "cancelled"
};

/**
 * @class
 * @extends {Ext.util.Observable}
 */
Documa.distribution.transaction.DistributedTransaction = Ext.extend(Ext.util.Observable, function(){
	var TAG = "Documa.distribution.transaction.DistributedTransaction";
	var _log = Documa.util.Logger;
	/////////////////////
	// private methods //
	/////////////////////

	/* TODO: add here your private methods */

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {String} id
		 * @param {String} initiator
		 * @param {Documa.context.ApplicationContext} appcontext
		 * @param {Array.<Documa.distribution.DistributionModification>} modifications
		 */
		constructor: function(id, appcontext, initiator){
			Documa.distribution.transaction.DistributedTransaction.superclass.constructor.call(this);
			/**
			 * @type {String}
			 * @protected
			 */
			this._id = id;

			/**
			 * @type {Documa.context.ApplicationContext}
			 * @protected
			 */
			this._appcontext = appcontext;

			/**
			 * @type {String}
			 * @protected
			 */
			this._initiator = initiator;

			/**
			 * Collection of distribution state modifications
			 * @type {Array.<Documa.distribution.DistributionModification>}
			 * @protected
			 */
			this._modifications = [];
		},

		/**
		 * @returns {String}
		 */
		getId: function(){
			return this._id;
		},

		/**
		 * @returns {String}
		 */
		getInitiator: function(){
			return this._initiator;
		},

		/**
		 * @returns {Documa.context.ApplicationContext}
		 */
		getApplicationContext: function(){
			return this._appcontext;
		},

		/**
		 * @returns {Array.<Documa.distribution.DistributionModification>}
		 */
		getModifications: function(){
			return this._modifications;
		},

		firePreparing: function(){
			this.fireEvent(Documa.distribution.transaction.TransactionEvents.PREPARING, this);
		},

		firePrepared: function(){
			this.fireEvent(Documa.distribution.transaction.TransactionEvents.PREPARED, this);
		},

		fireCompleted: function(){
			this.fireEvent(Documa.distribution.transaction.TransactionEvents.COMPLETED, this);
		},

		fireCancelled: function(){
			this.fireEvent(Documa.distribution.transaction.TransactionEvents.CANCELLED, this);
		}
	};
}());