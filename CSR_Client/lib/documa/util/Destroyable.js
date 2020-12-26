Ext.namespace('Documa.util');

Documa.util.Destroyable = Ext.extend(Object, (function() {
	return {
		constructor : function() {
			Documa.util.Destroyable.superclass.constructor.call(this);
			/*nothing todo here*/
		},

		destructor : function() {
			throw new Error("destructor operation not implemented in your class: " + this.constructor.toString());
		}

	};
})());
