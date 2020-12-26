Ext.namespace("Documa.components");

Documa.require("Documa.components.ComponentInputEvent");

Documa.components.InterfaceElements = {
	PROPERTY : "property",
	OPERATION : "operation",
	EVENT : "event"
};

Documa.components.ComponentCallEvent = Ext.extend(Documa.components.ComponentInputEvent, (function() {
	return {
		/**
		 * Creates component call event representing the call of an component interface 
		 * element, e. g. a property or an operation.
		 *
		 * @param {Documa.components.ComponentHandlerContext} context
		 * @param {String} instid component instance id
		 * @param {String} cid component id
		 * @param {String} elemName name of interface element
		 * @param {String} elemTyp type of interface element (values: 'property', 'operation', 'event')
		 * @param {Ext.cruise.Message} cruiseMessage
		 */
		constructor : function(context, instid, cid, elemName, elemType, cruiseMessage) {
			Documa.components.ComponentCallEvent.superclass.constructor.call(this, context);
			this._instid = instid;
			this._cid = cid;
			this._elemName = elemName;
			this._elemType = elemType;
			this._message = cruiseMessage;
		},
		getInstanceId : function() {
			return this._instid;
		},
		getComponentId : function(){
			return this._cid;
		},
		getElementName : function() {
			return this._elemName;
		},
		getElementType : function() {
			return this._elemType;
		},
		getMessage : function() {
			return this._message;
		},
		serialize : function() {
			return JSON.stringify({
				event: Documa.components.ComponentInputEventTypes.CALLEVENT,
				timestamp : this._timestamp,
				componentid : this._cid,
				instanceid : this._instid,
				name : this._elemName,
				type : this._elemType,
				message : this._message,
				handlerContext : this._context.serialize()
			});
		}
	};
})());
