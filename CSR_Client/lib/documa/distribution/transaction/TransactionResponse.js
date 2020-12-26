Ext.namespace("Documa.distribution.transaction");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

/**
 * @class
 */
Documa.distribution.transaction.TransactionResponse = Ext.extend(Object, (function(){
	return {
		/**
		 * Constructor.
		 * @param {String} id transaction id
		 */
		constructor: function(id){
			this._tid = id;
		},
		/**
		 * Returns migration transaction id.
		 * @returns {String}
		 */
		getTransactionId: function(){
			return this._tid;
		}
	};
})());