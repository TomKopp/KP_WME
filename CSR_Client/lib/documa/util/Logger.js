Ext.namespace('Documa.util');

/**
 * Singleton for logging.
 */
Documa.util.Logger = (function() {
	var DELIMITER = " : ";
	
	/**
	 * Returns timestamp.
	 * 
	 * @return {String}
	 */
	function getCurrentTimestamp(){
		var date = new Date();
		var dateString = date.getDate()+"."+(date.getMonth()+1)+"."+date.getFullYear();
		var timeString = date.getHours()+":"+date.getMinutes()+":"+date.getSeconds()+":"+date.getMilliseconds();
		return "["+dateString+"-"+timeString+"]";
	};

	return {

		info : function(args) {
			if (arguments.length == 2) {
				console.info(getCurrentTimestamp()+": "+arguments[0] + DELIMITER + arguments[1]);
			} else {
				console.info(getCurrentTimestamp()+": "+arguments[0]);
			}
		},

		error : function(args) {
			if (arguments.length == 2) {
				console.error(getCurrentTimestamp()+": "+arguments[0] + DELIMITER + arguments[1]);
			} else {
				console.error(getCurrentTimestamp()+": "+arguments[0]);
			}
			//console.trace();
		},

		warn : function(args) {
			if (arguments.length == 2) {
				console.warn(getCurrentTimestamp()+": "+arguments[0] + DELIMITER + arguments[1]);
			} else {
				console.warn(getCurrentTimestamp()+": "+arguments[0]);
			}
		},

		/**
		 * @param {Object[]} args
		 */
		debug : function(args) {
			if (arguments.length == 2) {
				// arguments more than expected
				console.log(getCurrentTimestamp()+": "+arguments[0] + DELIMITER + arguments[1]);
			} else {
				console.log(getCurrentTimestamp()+": "+arguments[0]);
			}
		},

		/**
		 * @param {Object[]} args
		 */
		trace : function(args){
			if (arguments.length == 2) {
				if(arguments[1].stack){
					console.error(getCurrentTimestamp()+": "+arguments[0] + DELIMITER + arguments[1].stack);	
				}
			} else {
				if(arguments[0].stack){
					console.error(getCurrentTimestamp()+": "+arguments[0].stack);	
				}
			}
		}
	};
})();
