Ext.namespace("Documa.ui.layout.strategy");

Documa.ui.layout.strategy.LayoutSelect = Ext.extend(Object, (function () {

	var TAG = "Documa.ui.layout.strategy.LayoutSelect";
	var _counter = 0;

	return {
		/**
		 * @constructor.
		 * @param {String} whereStatement
		 * @param {String} groupByStatement
		 * @param {String} offsetStatement
		 * @param {String} limitStatement
		 */
		constructor: function (whereStatement, groupByStatement, offsetStatement, limitStatement) {
			this._whereStmnt = whereStatement;
			this._groupBy = groupByStatement;
			this._offset = offsetStatement;
			this._limit = limitStatement;
			this._groups = [];
			this._id = "item"+_counter++;

			/**
			 * array of component containers, which are selected by the where statement
			 * @type {Array.<Documa.components.ComponentContainer>}
			 * @private
			 */
			this._components = [];
		},
		/**
		 * Returns 'where'-statement.
		 * @returns {String}
		 */
		getWhereStatement: function () {
			return this._whereStmnt;
		},

		/**
		 * Returns groupy by statement.
		 * @returns {String}
		 */
		getGroupByStatement: function () {
			return this._groupBy;
		},

		/**
		 * Returns component selection offset.
		 * @returns {String}
		 */
		getOffsetStatement: function () {
			return this._offset;
		},

		/**
		 * Returns component selection limit range.
		 * @returns {String}
		 */
		getLimitStatement: function () {
			return this._limit;
		},

		/**
		 * Returns array of component groups.
		 *
		 * @returns {Array.<Array.<Documa.components.ComponentContainer>>}
		 */
		getComponentGroups: function () {
			return this._groups;
		},
		/**
		 * Returns array of selected component container.
		 * @returns {Array.<Documa.components.ComponentContainer>}
		 */
		getSelectedComponents: function () {
			return this._components;
		},
		/**
		 * @returns {string}
		 */
		toString : function(){
			return this._id;
		}
	};
})());