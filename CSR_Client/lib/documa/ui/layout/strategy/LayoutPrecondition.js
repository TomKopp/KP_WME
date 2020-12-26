Ext.namespace("Documa.ui.layout.strategy");

Documa.require("Documa.util.Logger");

Documa.ui.layout.strategy.LayoutPrecondition = Ext.extend(Object, (function(){
	var TAG = "Documa.ui.layout.strategy.LayoutPrecondition";
	var _log = Documa.util.Logger;

	return {
		constructor: function() {
			// nothing to do here
		},
		/**
		 * Precondition descriptor node
		 * @type {Element}
		 */
		xmlNode: null,

		/**
		 * Precondition statement as executable code.
		 * @type {String}
		 */
		code: null
	};
})());