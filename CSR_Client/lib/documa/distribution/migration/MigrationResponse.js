Ext.namespace("Documa.distribution.migration");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

Documa.distribution.migration.MigrationResponse = Ext.extend(Object, (function () {
	return {
		/**
		 * Constructor.
		 * @param {String} mid migration transaction id
		 */
		constructor: function (mid) {
			this._mid = mid;
		},
		/**
		 * Returns migration transaction id.
		 * @returns {String|*}
		 */
		getMigrationId: function () {
			return this._mid;
		}
	};
})());