Ext.namespace('Documa.components');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.components.ComponentInputEvent');

Documa.components.TimeoutInputEvent = Ext.extend(Documa.components.ComponentInputEvent, (function() {
	var TAG = "Documa.components.TimeoutInputEvent";
	var _log = Documa.util.Logger;

	/**
	 * Helper method validating timeout parameters.
	 *
	 * @param {Number} id numerical timeout id
	 * @param {Number} delay timeout delay
	 * @param {Array} params parameter array
	 * @param {String} handlerId
	 */
	function validateParameters(id, delay, params, handlerId) {
		if (id == null || id == undefined)
			throw new Error("No timeout id defined!");
		if (delay == null || delay == undefined)
			throw new Error("No timeout delay defined!");
		if (handlerId == null || handlerId == undefined)
			throw new Error("No timeout handler id defined!");
	}

	return {
		/**
		 * Constructor.
		 * @param {Number} id numerical timeout id
		 * @param {Number} delay timeout delay
		 * @param {Array} params parameter array
		 * @param {String} handlerId
		 */
		constructor : function(context, id, delay, params, handlerId) {
			Documa.components.TimeoutInputEvent.superclass.constructor.call(this, context);
			validateParameters(id, delay, params, handlerId);
			this._timeoutId = id;
			this._delay = delay;
			this._params = params;
			this._handlerId = handlerId;
		},
		getTimeoutId : function() {
			return this._timeoutId;
		},
		getDelay : function() {
			return this._delay;
		},
		getArguments : function() {
			return this._params;
		},
		getHandlerId : function() {
			return this._handlerId;
		},
		serialize : function() {
			return JSON.stringify({
				event : Documa.components.ComponentInputEventTypes.TIMEREVENT,
				timestamp : this._timestamp,
				tid : this._timeoutId,
				delay : this._delay,
				arguments : this._params,
				handlerId : this._handlerId,
				handlerContext : this._context.serialize()
			});
		}
	};
})());
