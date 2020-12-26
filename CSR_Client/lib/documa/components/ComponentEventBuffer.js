Ext.namespace("Documa.components");

Documa.require('Documa.util.Logger');

Documa.components.ComponentEventBuffer = Ext.extend(Object, (function () {

	var TAG = "Documa.components.ComponentEventBuffer";
	var _log = Documa.util.Logger;

	return {
		/**
		 * Constructor.
		 * @constructor
		 */
		constructor: function () {
			Documa.components.ComponentEventBuffer.superclass.constructor.call(this);

			// map containing entries and each of it is a time-event-pair
			this._buffer = {};
			this._activityEvents = {};
			this._acount = 0;
			this._downstreamEvents = {};
			this._dcount = 0;
			this._count = 0;
		},
		/**
		 * Releases all internal resources.
		 */
		destroy: function () {
			// clear buffer
			this.removeAll();
			delete this._buffer;
			delete this._count;
		},

		/**
		 * Adds event that represents a component's activity at runtime.
		 * @param {Documa.components.ComponentInputEvent} inputEvent
		 */
		addActivityEvent: function (inputEvent) {
			_log.debug(TAG, "... adding activity event: ");
			this._activityEvents[inputEvent.getId()] = inputEvent;
			++this._acount;
			_log.debug(TAG, "... activity event count: " + this._acount);
		},
		/**
		 * Adds event that represents a component's input event at blocking time.
		 * @param {Documa.components.ComponentInputEvent} inputEvent
		 */
		addDownstreamEvent: function (inputEvent) {
			this._downstreamEvents[inputEvent.getId()] = inputEvent;
			++this._dcount;
			_log.debug(TAG, "... downstream event count: " + this._dcount);
		},
		/**
		 * Removes specified input event from buffer.
		 *
		 * @param {Documa.components.ComponentInputEvent} inputEvent
		 */
		remove: function (inputEvent) {
			var id = inputEvent.getId();
			_log.debug(TAG, "... removing input event: " + id);
			if (this._activityEvents[id]) {
				delete this._activityEvents[id];
				--this._acount;
			} else if (this._downstreamEvents[id]) {
				delete this._downstreamEvents[id];
				--this._dcount;
			} else {
				throw new Error("Could not determine input event with id: " + id);
			}
		},
		/**
		 * Returns component input event from id.
		 *
		 * @param {String} id input event id
		 */
		getInputEvent: function (id) {
			if (this._activityEvents[id]) {
				return this._activityEvents[id];
			} else if (this._downstreamEvents[id]) {
				return this._downstreamEvents[id];
			} else {
				return null;
			}
		},
		/**
		 * Clears the whole input event buffer.
		 */
		removeAll: function () {
			_log.debug(TAG, "... removing all input events!");
			//for (var time in this._buffer) {
			//	delete this._buffer[time];
			//}
			for (var id in this._activityEvents) {
				delete this._activityEvents[id];
			}

			for (var id in this._downstreamEvents) {
				delete this._downstreamEvents[id];
			}
		},

		/**
		 * Returns buffer of activity events.
		 *
		 * @returns {Object.<Documa.components.ComponentInputEvent>}
		 */
		getActivityEventBuffer: function () {
			return this._activityEvents;
		},

		/**
		 * Returns buffer of downstream events.
		 * @returns {Object.<Documa.components.ComponentInputEvent>|*}
		 */
		getDownstreamEventBuffer: function () {
			return this._downstreamEvents;
		},

		getBuffer: function () {
			return this._buffer;
		}
	};
})());
