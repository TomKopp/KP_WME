Ext.namespace("Documa.distribution.migration");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.migration.MigrationResponse");

Documa.distribution.migration.MigrationCancelCodes = {
	OK: 900,
	FAILURE: 901
};

Documa.distribution.migration.MigrationCancelResponse = Ext.extend(Documa.distribution.migration.MigrationResponse, (function () {
	var TAG = "Docma.distribution.migration.MigrationCancelResponse";
	var _log = Documa.util.Logger;

	return {
		/**
		 * @constructor.
		 *
		 * @param {String} mid migration transaction id
		 * @param {Number} code cancellation response code
		 * @param {Object} data
		 */
		constructor: function (mid, code, data) {
			Documa.distribution.migration.MigrationCancelResponse.superclass.constructor.call(this, mid);
			this._data = data;
			this._code = code;
		},
		/**
		 * Returns data object of cancel response.
		 * @returns {Object}
		 */
		getData: function () {
			return this._data;
		},

		/**
		 * Returns short representation of response content (success or error response).
		 * @returns {Number}
		 */
		getCode: function () {
			return this._code;
		},
		/**
		 * Returns cancellation response payload object.
		 * @returns {{mid: string, code: number, data: object}}
		 */
		getPayload: function () {
			return {
				mid: this._mid,
				code: this._code,
				data: this._data
			};
		}

	};
})());
