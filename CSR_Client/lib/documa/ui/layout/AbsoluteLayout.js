Ext.namespace('Documa.ui.layout');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.layout.Layout');
Documa.require('Documa.ui.layout.Position');

Documa.ui.layout.AbsoluteLayout = Ext.extend(Documa.ui.layout.Layout, (function() {

	var TAG = 'Documa.ui.layout.Layout';
	var _log = Documa.util.Logger;

	return {
		constructor : function(layoutPl) {
			Documa.ui.layout.AbsoluteLayout.superclass.constructor.call(this, layoutPl.name, layoutPl.agile, layoutPl.styles, layoutPl.bounds.width, layoutPl.bounds.height);
			this._positions = [];

			try {
				for (var i = 0; i < layoutPl.positions.length; ++i) {
					// create position element from array of payload objects
					var pos = new Documa.ui.layout.Position(layoutPl.positions[i].layout, layoutPl.positions[i]);
					this._positions.push(pos);
				}
			} catch(error) {
				_log.error(TAG, "... error during instantiation: " + error);
			}
		},

		/**
		 * Returns array of position description elements.
		 *
		 * @return {Array} array of all component position elements
		 */
		getPositions : function() {
			return this._positions;
		},

		/**
		 * Add a new position to the array of position description elements.
		 *
		 * @param {Object} position object
		 */
		addPosition : function(position) {
			var pos = new Documa.ui.layout.Position(position.layout, position);
			this._positions.push(pos);
		},
	};
})());
