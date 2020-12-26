Ext.namespace("Documa.ui.layout.strategy");

Documa.ui.layout.strategy.LayoutContextState = Ext.extend(Object, (function () {
	return {
		/**
		 * Ctor.
		 * @constructor.
		 *
		 * @param {Number} viewportWidth
		 * @param {Number} viewportHeight
		 */
		constructor: function (viewportWidth, viewportHeight) {
			this.viewportWidth = viewportWidth;
			this.viewportHeight = viewportHeight;
		},
		/**
		 * Viewport width property.
		 * @type {Number}
		 */
		viewportWidth: null,
		/**
		 * Viewport width property.
		 * @type {Number}
		 */
		viewportHeight: null
	};
})());