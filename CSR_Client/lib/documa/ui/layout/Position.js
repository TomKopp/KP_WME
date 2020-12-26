Ext.namespace('Documa.ui.layout');

Documa.require('Documa.ui.layout.LayoutElement');

Documa.ui.layout.Position = Ext.extend(Documa.ui.layout.LayoutElement, (function(){
	return {
		constructor : function(child, posPayload){
			Documa.ui.layout.Position.superclass.constructor.call(this, 
				child, 
				posPayload.component, 
				posPayload.bounds.width, 
				posPayload.bounds.height, 
				posPayload.unit);
				
			this._x = posPayload.origin.x;
			this._y = posPayload.origin.y;
		},
		
		/**
		 * Returns positions origin coordinates.
		 * 
		 * @return {Object}
		 */
		getOrigin : function(){
			return {
				x: this._x,
				y: this._y
			};
		}
	};
})());
