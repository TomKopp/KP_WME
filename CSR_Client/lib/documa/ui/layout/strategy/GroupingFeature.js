Ext.namespace("Documa.ui.layout.strategy");

Documa.require("Documa.util.Logger");

Documa.ui.layout.strategy.GroupingFeatureTypes = {
	ROW_GROUPING: "rowGrouping",
	COMPONENT_PROP: "componentProperty"
};

Documa.ui.layout.strategy.GroupingFeature = Ext.extend(Object, (function () {
	var TAG = "Documa.ui.layout.strategy.GroupingFeature";
	var _log = Documa.util.Logger;


	return {
		/**
		 * CTOR.
		 * @constructor.
		 *
		 * @param {String} type
		 * @param {Object} payload
		 */
		constructor: function (type, payload) {
			this.type = type;
			this.payload = payload;
		},

		/**
		 * Uniquegrouping feature type.
		 * @type {String}
		 */
		type: null,

		/**
		 * Optional name attribute.
		 * @type {String}
		 */
		name: null,

		/**
		 * Type specific group description payload.
		 * @type {Object}
		 */
		payload: null
	};
})());