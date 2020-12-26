Ext.namespace("Documa.components");

Documa.require("Documa.components.ComponentInputEvent");

Documa.components.IntervalInputEvent = Ext.extend(Documa.components.ComponentInputEvent, (function() {
	return {
		/**
		 * Constructor.
		 *
		 * @param {Documa.components.ComponentHandlerContext} context
		 * @param {Number} id
		 * @param {Number} interval
		 * @param {Number} count count of already executed intervals
		 * @param {Array} params parameter array
		 * @param {Object} handlerId
		 */
		constructor : function(context, id, interval, count, params, handlerId) {
			Documa.components.IntervalInputEvent.superclass.constructor.call(this, context);
			this._intervalId = id;
			this._interval = interval;
			this._count = count;
			this._params = params;
			this._handlerId = handlerId;
		},
		getIntervalId : function(){
			return this._intervalId;
		},
		getInterval : function() {
			return this._interval;
		},
		getCount : function() {
			return this._count;
		},
		getArguments : function() {
			return this._params;
		},
		getHandlerId : function() {
			return this._handlerId;
		},
		serialize : function() {
			return JSON.stringify({
				event : Documa.components.ComponentInputEventTypes.INTERVALEVENT,
				timestamp : this._timestamp,
				iid : this._intervalId,
				interval : this._interval,
				count : this._count,
				arguments : this._params,
				handlerId : this._handlerId,
				handlerContext : this._context.serialize()
			});
		}

	};
})()); 