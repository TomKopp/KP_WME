Ext.namespace('Documa.ui.layout');

Documa.require('Documa.util.Logger');

/**
 * @class
 */
Documa.ui.layout.Layout = Ext.extend(Object, (function() {
	var TAG = 'Documa.ui.layout.Layout';
	return {
		/**
		 * @constructs
		 * @param name
		 * @param agile
		 * @param styles
		 * @param width
		 * @param height
		 */
		constructor : function(name, agile, styles, width, height) {
			Documa.ui.layout.Layout.superclass.constructor.call(this);
			this._name = name;
			this._agile = agile;
			this._width = width;
			this._height = height;
			this._styles = [];
			// currently no styles are supported
		},

		/**
		 * Return array of associated style objects.
		 *
		 * @return {Array} array list of related style objects
		 */
		getStyles : function() {
			return this._styles;
		},

		/**
		 * Returns the layout name.
		 *
		 * @return {String}
		 */
		getName : function() {
			return this._name;
		},

		/**
		 * Returns flag that indicates layouts dynamic behaviour.
		 *
		 * @return {Boolean} true if layout supports dynamic behaviour
		 */
		isAgile : function() {
			return this._agile;
		},

		/**
		 * Returns bounds of this layout. Value object contains width and height values.
		 *
		 * @return {Object}
		 */
		getBounds : function() {
			return {
				width : this._width,
				height : this._height
			};
		}
	};
})());
