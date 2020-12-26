Ext.namespace('Documa.ui.layout');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.layout.Layout');
Documa.require('Documa.ui.layout.FlexBoxPosition');

/**
 * The flex box layout uses the CSS3 flexbox to align components automatically in case of dynamic application development
 */
Documa.ui.layout.FlexBoxLayout = Ext.extend(Documa.ui.layout.Layout, (function () {

	var TAG = 'Documa.ui.layout.FlexBoxLayout';
	var _log = Documa.util.Logger;


	return {
		constructor: function (layoutPl) {
			Documa.ui.layout.FlexBoxLayout.superclass.constructor.call(this, layoutPl.name, layoutPl.agile, layoutPl.styles, layoutPl.bounds.width, layoutPl.bounds.height);
			this._positions = [];

			try {
				for (var i = 0; i < layoutPl.positions.length; ++i) {
					// create position element from array of payload objects
					var pos = new Documa.ui.layout.FlexBoxPosition(layoutPl.positions[i].layout, layoutPl.positions[i]);
					this._positions.push(pos);
				}
			} catch (error) {
				_log.error(TAG, "... error during instantiation: " + error);
			}
		},

		/**
		 * Returns array of position description elements.
		 *
		 * @return {Array} array of all component position elements
		 */
		getPositions: function () {
			return this._positions;
		},

		/**
		 * Add a new position to the array of position description elements.
		 *
		 * @param {Object} position object
		 */
		addPosition: function (position) {
			var pos = new Documa.ui.layout.FlexBoxPosition(position.layout, position);
			this._positions.push(pos);
		},

		/**
		 * Removes a position of the array of position description elements.
		 *
		 * @param {String} instanceID
		 */
		removePosition: function (instid) {
			for (var i = 0; i < this._positions.length; i++) {
				if (this._positions[i]._instid === instid) {
					this._positions.splice(i, 1);
				}
			}
		}

	};
})());
