Ext.namespace("Documa.distribution.transaction");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.transaction.TransactionResponse");

Documa.distribution.transaction.CancelCodes = {
	OK: 900,
	FAILURE: 901
};

/**
 * @class
 * @extends {Documa.distribution.transaction.TransactionResponse}
 */
Documa.distribution.transaction.CancelResponse = Ext.extend(Documa.distribution.transaction.TransactionResponse, (function(){
	var TAG = "Docma.distribution.migration.MigrationCancelResponse";
	var _log = Documa.util.Logger;
	return {
		/**
		 * @constructs.
		 * @param {String} tid transaction id
		 * @param {Number} code cancellation response code
		 * @param {Object} data
		 */
		constructor: function(tid, code, data){
			Documa.distribution.transaction.CancelResponse.superclass.constructor.call(this, tid);
			this._data = data;
			this._code = code;
		},
		/**
		 * Returns data object of cancel response.
		 * @returns {Object}
		 */
		getData: function(){
			return this._data;
		},

		/**
		 * Returns short representation of response content (success or error response).
		 * @returns {Number}
		 */
		getCode: function(){
			return this._code;
		},
		/**
		 * Returns cancellation response payload object.
		 * @returns {{mid: string, code: number, data: object}}
		 */
		getPayload: function(){
			return {
				tid: this._tid,
				code: this._code,
				data: this._data
			};
		}
	};
})());
