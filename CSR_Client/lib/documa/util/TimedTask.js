Ext.namespace("Documa.util");

/**
 * @class
 */
Documa.util.TimedTask = Ext.extend(Object, function(){
	var TAG = "Documa.util.TimedTask";
	var _log = Documa.util.Logger;
	/////////////////////
	// private methods //
	/////////////////////


	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function(){
			Documa.util.TimedTask.superclass.constructor.call(this);
			this._timer = null;
		},

		/**
		 * @param {number} duration
		 * @returns {Promise}
		 */
		wait: function(duration){
			var self = this;
			return new Promise(function(fulfill){
				self._timer = setTimeout(fulfill, duration);
			});
		},

		cancel: function(){
			if (this._timer) {
				clearTimeout(this._timer);
			}
		}
	};
}());