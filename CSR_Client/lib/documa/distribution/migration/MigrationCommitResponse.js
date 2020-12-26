Ext.namespace("Documa.distribution.migration");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.migration.MigrationResponse");

Documa.distribution.migration.MigrationCommitCodes = {
	OK: 100,
	FAILURE: 200
};

Documa.distribution.migration.MigrationCommitResponse = Ext.extend(Documa.distribution.migration.MigrationResponse, (function () {
	var TAG = "Documa.distribution.migration.MigrationCommitResponse";
	var _log = Documa.util.Logger;

	return {
		/**
		 * Constructor.
		 * @param {String} mid migration transaction id
		 * @param {Array} downstreamEvents array of component down stream events
		 * each item's structure:
		 * {
         *   cinstance: <string>,
         *   events : <array>
         * }
		 */
		constructor: function (mid, data) {
			Documa.distribution.migration.MigrationCommitResponse.superclass.constructor.call(this, mid);
			this._data = data;
		},
		/**
		 * Returns response payload data.
		 * @returns {Object}
		 */
		getData: function () {
			return this._data;
		},
		/**
		 *
		 * @returns {{mid: (String), data: Object}}
		 */
		getPayload: function () {
			return {
				mid: this._mid,
				data: this._data
			};
		}
	};
})()); 