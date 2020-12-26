Ext.namespace("Documa.components");

Documa.components.ComponentLoadingStateEvents = {
	PROGRESSCHANGED : "progressChanged"
};

Documa.components.ComponentLoadingState = Ext.extend(Ext.util.Observable, (function() {
	return {
		constructor : function(cid, instid) {
			Documa.components.ComponentLoadingState.superclass.constructor.call(this);
			this._progress = 0.0;
			this._cid = cid;
			this._instid = instid;
			this.addEvents(Documa.components.ComponentLoadingStateEvents.PROGRESSCHANGED);
		},

		/**
		 * Returns component's id.
		 *
		 * @return {String}
		 */
		getComponentId : function() {
			return this._cid;
		},

		/**
		 * Returns component's instance id.
		 *
		 * @return {String}
		 */
		getInstanceId : function() {
			return this._instid;
		},

		/**
		 * Returns current progress value.
		 *
		 * @return {double}
		 */
		getProgress : function() {
			return this._progress;
		},

		/**
		 * Sets current progress value and fires progress changed event.
		 * @param {double} value
		 */
		setProgress : function(value) {
			// publishing old and new value to observers
			this.fireEvent(Documa.components.ComponentLoadingStateEvents.PROGRESSCHANGED, value);

			// setting new value
			this._progress = value;
		}

	};
})());
