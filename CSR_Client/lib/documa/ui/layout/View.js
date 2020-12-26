Ext.namespace('Documa.ui.layout');

Documa.ui.layout.View = Ext.extend(Object, (function(){
	return {
		constructor : function(name, layout){
			Documa.ui.layout.View.superclass.constructor.call(this);
			this._name = name;
			this._layout = layout;
		},
		
		/**
		 * Returns name of the view instance.
		 * 
		 * @return {String} 
		 */
		getName : function(){
			return this._name;
		},
		
		/**
		 * Returns related object instance.
		 * 
		 * @return {Documa.communication.protocol.Layout} 
		 */
		getLayout : function(){
			return this._layout;
		}
	};
})());
