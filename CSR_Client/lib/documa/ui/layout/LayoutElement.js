Ext.namespace('Documa.ui.layout');

/**
 * @class
 */
Documa.ui.layout.LayoutElement = Ext.extend(Object, (function(){
	return {
		/**
		 * @constructs
		 * @param {Documa.ui.layout.Layout} childLayout
		 * @param {String} instid
		 * @param {Number} width
		 * @param {Number} height
		 * @param {String} unit
		 */
		constructor: function(childLayout, instid, width, height, unit){
			this._childLayout = parent;
			this._width = width;
			this._height = height;
			this._unit = unit;
			this._instid = instid;
		},

		/**
		 * Returns instance id of related component.
		 * @return {String}
		 */
		getComponentInstanceId: function(){
			return this._instid;
		},

		/**
		 * Returns parent element.
		 *
		 * @return {Documa.ui.layout.Layout}
		 */
		getChildLayout: function(){
			return this._childLayout;
		},

		/**
		 * Returns size object.
		 *
		 * @return {{width:number, height:number}}
		 */
		getSize: function(){
			return {
				width: this._width,
				height: this._height
			};
		},

		/**
		 * Returns rendering unit of this layout element.
		 *
		 * @return {String}
		 */
		getUnit: function(){
			return this._unit;
		}
	};
})());
