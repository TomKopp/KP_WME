Ext.namespace("Documa.interrupt");

Documa.interrupt.AppInterrupt = Ext.extend(Object, (function(){
	return {
		constructor : function(payload){
			Documa.interrupt.AppInterrupt.superclass.constructor.call(this);
			this._cause = payload.cause;
			this._descr = payload.descr;
			this._appid = payload.id;
			this._appvrs = payload.version;
		},
		
		getApplicationId : function(){
			return this._appid;
		},
		
		getApplicationVersion : function(){
			return this._appvrs;
		},
		
		getCause : function(){
			return this._cause;
		},
		
		getDescription : function(){
			return this._descr;
		}
	};
})());
