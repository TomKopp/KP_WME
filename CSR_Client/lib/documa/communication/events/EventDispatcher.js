Ext.namespace('Documa.communication.events');

Documa.require('Documa.util.Logger');

/**
 * Dipatches events locally.
 * @class
 */
Documa.communication.events.EventDispatcher = Ext.extend(Object, (function() {
	var TAG = "Documa.communication.events.EventDispatcher";
	var _log = Documa.util.Logger;
	return {
		/**
		 * @constructs
		 */
		constructor: function() {
			this._handler = {};
		},
		/**
		 * Registers event handler.
		 * @param {String} evtTag event name
		 * @param {Object} scope handler scope
		 * @param {Function} handler
		 */
		addEventListener: function(evtTag, scope, handler) {
			if (!evtTag instanceof String) {
				throw new Error("Invalid event argument defined");
			}

			if (!handler instanceof Function)
				throw new Error("Invalid handler function defined");

			var handlerList = this._handler[evtTag];

			if (!handlerList) {
				handlerList = new Array();
				this._handler[evtTag] = handlerList;
			}

			// only add new handler functions
			if (handlerList.indexOf(handler) < 0) {
				handlerList.push({
					'scope': scope,
					'handler': handler
				});
			} else {
				_log.warn(TAG, "... event handler already added.");
			}
		},

		/**
		 * @param {Documa.communication.events.Event} evt
		 */
		dispatchEvent: function(evt) {
			if (!evt instanceof Documa.communication.events.Event) {
				throw new Error("Invalid event argument defined");
			}

			var handlerList = this._handler[evt.getMessageTag()];
			if (handlerList === undefined || handlerList === null || handlerList.length === 0) {
				_log.warn(TAG, "No event handler defined!");
				return;
			}

			for (var i = 0; i < handlerList.length; ++i) {
				// get object containing handler function and its scope
				var handlerObj = handlerList[i];

				// call current event handler function within the specified scope
				handlerObj.handler.call(handlerObj.scope, evt);
			}
		},
		/**
		 * @param {Function} handler
		 */
		removeEventListener: function(handler) {
			for (var evtTag in this._handler) {
				var handlerList = this._handler[evtTag];
				if (handlerList === undefined ||
						handlerList === null ||
						handlerList.length === 0 ||
						handlerList.indexOf(handler) < 0) {
					continue;
				} else {
					// found handler to remove
					handlerList.splice(handler, 1);
				}
			}
		}
	};
})());
