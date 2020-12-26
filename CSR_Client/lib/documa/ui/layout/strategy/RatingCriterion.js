Ext.namespace('Documa.ui.layout.strategy');

Documa.require('Documa.util.Logger');

Documa.ui.layout.strategy.RatingCriterion = Ext.extend(Object, (function() {
	var TAG = "Documa.ui.layout.strategy.RatingCriterion";
	var _log = Documa.util.Logger;
	return {
		/**
		 * @type {String}
		 */
		code : null,
		/**
		 * Criterion weight.
		 * @type {Number}
		 */
		weight : 1,

		/**
		 * @type {String}
		 */
		scope : "global"
	};
})());