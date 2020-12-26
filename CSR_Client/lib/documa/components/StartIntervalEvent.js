Ext.namespace("Documa.components");

Documa.require("Documa.util.Logger");
Documa.require("Documa.components.ComponentInputEvent");

Documa.components.StartIntervalEvent = Ext.extend(Documa.components.ComponentInputEvent, (function () {
	var TAG = "Documa.components.StartIntervalEvent";
	var _log = Documa.util.Logger;
	return {
		/**
		 * Constructor.
		 *
		 * @param {Documa.components.ComponentHandlerContext} handlerContext
		 * @param {Number} id
		 * @param {Number} delay
		 */
		constructor: function (handlerContext, id, delay) {
			Documa.components.StartIntervalEvent.superclass.constructor.call(this, handlerContext);
			this._id = id;
			this._delay = delay;
		},
		getIntervalId: function () {
			return this._id;
		},
		getDelay : function() {
			return this._delay;
		},
		serialize: function () {
			return JSON.stringify({
				event: Documa.components.ComponentInputEventTypes.STARTINTERVAL,
				timestamp: this._timestamp,
				intervalId: this._id,
				delay: this._delay,
				handlerContext : this._context.serialize()
			});
		}
	};
})());
