Ext.namespace("Documa.components");

Documa.require("Documa.components.ComponentInputEvent");

Documa.components.ServiceResponseEvent = Ext.extend(Documa.components.ComponentInputEvent, (function() {
	return {
		/**
		 * Represents an incoming service response.
		 * 
		 * @param {Documa.components.ComponentHandlerContext} context object describing event handler
		 * @param {XMLHttpRequest} xhrObject representing the response data and corresponding state
		 */
		constructor: function(context, xhrObject) {
			Documa.components.ServiceResponseEvent.superclass.constructor.call(this, context);
			this._responseState = xhrObject;
		},
		getState: function() {
			return this._responseState.readyState;
		},
		getStatus: function() {
			return this._responseState.status;
		},
		getResponse: function() {
			return this._responseState.response;
		},
		getResponseType: function() {
			return this._responseState.responseType;
		},
		getHeaders: function() {
			return this._responseState.getAllResponseHeaders();
		},
		serialize: function() {
			return JSON.stringify({
				event: Documa.components.ComponentInputEventTypes.SERVICEEVENT,
				timestamp: this._timestamp,
				state: this._responseState.readyState,
				status: this._responseState.status,
				statusText: this._responseState.statusText,
				response: this._responseState.response,
				responseType: this._responseState.responseType,
				responseHeaders: this._responseState.getAllResponseHeaders(),
				handlerContext : this._context.serialize()
			});
		}
	};
})());
