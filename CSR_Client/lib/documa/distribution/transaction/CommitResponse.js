Ext.namespace("Documa.distribution.transaction");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.transaction.TransactionResponse");

Documa.distribution.migration.MigrationCommitCodes = {
	OK: 100,
	FAILURE: 200
};

/**
 * @class
 * @extends {Documa.distribution.transaction.TransactionResponse}
 */
Documa.distribution.transaction.CommitResponse = Ext.extend(Documa.distribution.transaction.TransactionResponse, (function(){
	var TAG = "Documa.distribution.transaction.CommitResponse";
	var _log = Documa.util.Logger;
	return {
		/**
		 * Constructor.
		 * @param {String} tid transaction id
		 * @param {Array} downstreamEvents array of component down stream events
		 * each item's structure:
		 * {
         *   cinstance: <string>,
         *   events : <array>
         * }
		 */
		constructor: function(tid, data){
			Documa.distribution.transaction.CommitResponse.superclass.constructor.call(this, tid);
			this._data = data;
		},
		/**
		 * Returns response payload data.
		 * @returns {Object}
		 */
		getData: function(){
			return this._data;
		},
		/**
		 *
		 * @returns {{mid: (String), data: Object}}
		 */
		getPayload: function(){
			return {
				tid: this._tid,
				data: this._data
			};
		}
	};
})()); 