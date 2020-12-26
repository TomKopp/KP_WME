Ext.namespace('Documa.ui.layout');

Documa.require('Documa.ui.layout.LayoutElement');


Documa.ui.layout.FlexBoxPosition = Ext.extend(Documa.ui.layout.LayoutElement, (function () {
	return {
		/**
		 * expects the following ositionPayload:
		 * {
		 * 	bounds:{
		 * 			minheight:...
		 * 			maxheight:...
		 * 			minwidth:...
		 * 			maxwidth:...
		 * 			},
		 * component: "comp02",
		 * order: 0,
		 * layout: "flexbox",
		 * unit:"pixel"
		 * }
		 *
		 */
		constructor: function (child, posPayload) {
			Documa.ui.layout.Position.superclass.constructor.call(this,
				child,
				posPayload.component,
				0,
				0,
				posPayload.unit);

			this._instid = posPayload.component;
			this._order = posPayload.order;
			this._minwidth = posPayload.bounds.minwidth;
			this._maxwidth = posPayload.bounds.maxwidth;
			this._minheight = posPayload.bounds.minheight;
			this._maxheight = posPayload.bounds.maxheight;
		},

		/**
		 * Returns positions bounds.
		 *
		 * @return {Object}
		 */
		getBounds: function () {
			return {
				minwidth: this._minwidth,
				maxwidth: this._maxwidth,
				minheight: this._minheight,
				maxheight: this._maxheight
			};
		},

		/**
		 * Returns instid.
		 *
		 * @return {Object}
		 */
		getInstid: function () {
			return {
				instid: this._instid
			};
		}
	};
})());
