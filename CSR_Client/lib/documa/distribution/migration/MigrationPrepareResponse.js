Ext.namespace("Documa.distribution.migration");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.migration.MigrationResponse");

Documa.distribution.migration.MigrationPrepareCodes = {
	ALL_COMPONENTS_READY : 800,
	ALL_COMPONENTS_EXECUTABLE : 801,
	NOTALL_COMPONENTS_READY : 802,
	NOTALL_COMPONENTS_EXECUTABLE : 803,
	MIGRATION_CANCELLED_BYUSER : 804,
	// TODO: add further codes here
	NO_COMPONENT_EXECUTABLE : 810
};

Documa.distribution.migration.MigrationPrepareResponse = Ext.extend(Documa.distribution.migration.MigrationResponse, (function() {
	return {
		constructor : function(mid, code, data) {
            Documa.distribution.migration.MigrationPrepareResponse.superclass.constructor.call(this, mid);
			this._code = code;
			this._data = data;
		},
		/**
		 * Returns migration prepare response code. Possibel values are 
		 * defined in enumeration object {Documa.distribution.migration.MigrationPrepareCodes}.
		 * 
		 * @returns {Number}
		 */
		getReadyCode : function() {
			return this._code;
		},
		/**
		 * Returns generic payload data of this response, e.g. state data of migrating components.
		 * 
		 * @returns {Object}
		 */
		getData : function() {
			return this._data;
		},
		/**
		 * Returns payload object of this response.
		 * 
		 * @returns {Object}
		 */
		getPayload : function() {
			return {
				mid : this._mid,
				code : this._code,
				data : this._data
			};
		}

	};
})());
