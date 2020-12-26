Ext.namespace("Documa.distribution.transaction");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.transaction.TransactionResponse");

Documa.distribution.transaction.PrepareCodes = {
	ALL_COMPONENTS_READY: 800,
	ALL_COMPONENTS_EXECUTABLE: 801,
	NOTALL_COMPONENTS_READY: 802,
	NOTALL_COMPONENTS_EXECUTABLE: 803,
	MIGRATION_CANCELLED_BYUSER: 804,
	NO_COMPONENT_EXECUTABLE: 810,
	CHANNEL_INTEGRATION_SUCCESS: 900,
	CHANNEL_INTEGRATION_FAILURE: 901
	// TODO: add further codes here
};

/**
 * @class
 * @extends {Documa.distribution.transaction.TransactionResponse}
 */
Documa.distribution.transaction.PrepareResponse = Ext.extend(Documa.distribution.transaction.TransactionResponse, (function(){
	return {
		/**
		 * @constructs
		 * @param {String} tid transaction id
		 * @param {number} code
		 * @param {Object} data
		 */
		constructor: function(tid, code, data){
			Documa.distribution.transaction.PrepareResponse.superclass.constructor.call(this, tid);
			this._code = code;
			this._data = data;
		},
		/**
		 * Returns migration prepare response code. Possibel values are
		 * defined in enumeration object {Documa.distribution.migration.MigrationPrepareCodes}.
		 *
		 * @returns {Number}
		 */
		getReadyCode: function(){
			return this._code;
		},
		/**
		 * Returns generic payload data of this response, e.g. state data of migrating components.
		 *
		 * @returns {Object}
		 */
		getData: function(){
			return this._data;
		},
		/**
		 * Returns payload object of this response.
		 *
		 * @returns {Object}
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
