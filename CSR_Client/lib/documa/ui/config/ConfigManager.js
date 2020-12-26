Ext.namespace('Documa.ui.config');

/**
 * @class Documa.ui.config.ConfigManager
 * This class is responsible for set, remove and save configuration
 *
 * @author Philip Manja, Anne Schumacher, Sergej Hahn
 */

Documa.ui.config.ConfigManager = Ext.extend(Object, (function () {
	
	var TAG = 'Documa.ui.config.ConfigManager';
	var _log = Documa.util.Logger;

	var _configs = [];
	var _configsJson = [];
	
	var _configManager = this;

	var callback_array = [];



	///////////////////////
	// Private Functions //
	///////////////////////

	/**
	 * Check configuration according to various criteria
	 * @param {String} con
	 */
	function checkConfig(con){

		if(con.id === null && con.name === null && con.user === null &&
		con.device === null && 4 > con.cols < 0 && 4 > con.rows < 0 &&
		con.devices instanceof Array){
			console.log("check: false")
			return false;
		}else{
			console.log("check: true")
			return true;
		}
	}
	
	///////////////////////
	// Public Functions //
	///////////////////////

	return{
		constructor: function(){
			this.loadConfigsFromStorage();
		},

		/**
		 * Adds a new callback function to the list.
		 */
		addOnChangeConfig: function(callback) {
			if (callback_array.indexOf(callback) > -1)	{
				return;	
			} else {
				callback_array.push(callback);
			}
		},

		/**
		 * Removes the callback function from the callback stack
		 */
		removeOnChangeConfig: function(callback) {
			var index = callback_array.indexOf(callback);
			if (index > -1) {
				callback_array = callback_array.splice(index, 1);
			}
		},

		/**
		 * Set an empty configuration
		 */
		setEmtyConfig : function(){
			var emptycon = {
				id:null,
				name:null,
				user:null,
				device:null,
				cols:null,
				rows:null,
				devices:[]
			};
		},

		/**
		 * Set attributes in configuration
		 * @param {String} id
		 * @param {String} name
		 * @param {String} user
		 * @param {String} device
		 * @param {Array} devices
		 * @param {String} rows
		 * @param {String} cols
		 */
		setConfig : function(id, name, user, device, cols, rows, devices) {
			
			var con = {
						id:id,
						name:name,
						user:user,
						device:device,
						cols:cols,
						rows:rows,
						devices:devices

			};
			


			if(checkConfig(con)){
				// add config to the beginning of the array so that _configs[0] is always the current config
				_configs.unshift(con);

				// update local storage
				this.saveConfigsToStorage();

				// notify the callback stack
				for (var i = 0; i < callback_array.length; i++) {
					callback_array[i].call();
				}
			}
		


		},
		/**
		 * Set an existing Configuration
		 * @param {String} con
		 */
		setExistingConfig : function(con){

			if(checkConfig(con)){
				// add config to the beginning of the array so that _configs[0] is always the current config
				_configs.unshift(con);

				// update local storage
				this.saveConfigsToStorage();

				// notify the callback stack
				for (var i = 0; i < callback_array.length; i++) {
					callback_array[i].call();
				}
			}
		},

		/**
		 * Save the configuration
		 */
		saveConfigsToStorage : function() {
			
			var writeStorePromise = new Promise(function(resolve, reject) {
				
				_configsJson = [];
				
				for (var i = 0; i < _configs.length; i++){
					
					var configJson = {
										"id" 		: _configs[i].id,
										"name" 		: _configs[i].name,
										"user" 		: _configs[i].user,
										"device" 	: _configs[i].device,
										"cols" 		: _configs[i].cols,
										"rows" 		: _configs[i].rows,
										"devices" 	: _configs[i].devices
									  };
					
					_configsJson.unshift(configJson);
				}
				var storeBeforeSaving = Ext.decode(localStorage.getItem("configs"));
				localStorage.setItem("configs", Ext.encode(_configsJson));
				
				if (Ext.decode(localStorage.getItem("configs")) != storeBeforeSaving) {
				  resolve("Wrote configs to local storage!");
				}
				// if local storage is the same as before, something went wrong
				else {
				  reject(Error("Couldn't write configs to local storage."));
				}
			});
			
			writeStorePromise.then(function(result) {
				  console.debug(result);
				}, function(rejectMessage) {
				  console.debug(rejectMessage);
				  // try again if it didn't work
				  saveConfigsToStorage();
				});
		},

		/**
		 * Acitivate configuration
		 * @param {String} index
		 */
		activateConfig : function(index) {
			// move config from its original position to first position
		    _configs.splice(0, 0, _configs.splice(index, 1)[0]);
		},

		/**
		 * Get current Configuration
		 */
		getCurrentConfig : function() {
			if (_configs.length > 0) {
				return _configs[0];
			} else return null;
		},

		/**
		 * Get configuration for a given name
		 * @param {String} name
		 */
		getConfigByName : function(name) {
			for (var i = 0; i < _configs.length; i++) {
			    if (_configs[i].name === name) {
			    	_log.debug(TAG, " Loading config: "+name);
			    	return _configs[i];
			    }
			}
			
			_log.debug(TAG, " Could not load config "+name);
			return null;
			
		},

		/**
		 * Get configuration for a given device
		 * @param {String} device
		 */
		getConfigByDevice : function(device) {
			for (var i = 0; i < _configs.length; i++) {
			    if (_configs[i].device === device) {
			    	_log.debug(TAG, " Loading config for device: "+device);
			    	return _configs[i];
			    }
			}
			
			_log.debug(TAG, " Could not load config for device "+device);
			return null;
			
		},

		/**
		 * Load the configuration from the storage
		 */
		loadConfigsFromStorage : function() {
			// get configs from local storage
			var readStorePromise = new Promise(function(resolve, reject) {
			
				_configsJson = Ext.decode(localStorage.getItem("configs"));
				
				if (_configsJson != []) {
				  resolve("Configs found in storage!");
				}
				else {
				  reject("No configs found in storage.");
				}
			});
			
			readStorePromise.then(function(result) {
				  console.debug(result);
				  
				  // if promise was successful, write configs to js object
				  for (var i = 0; i < _configsJson.length; i++){
					
					var con = {
							id:_configsJson[i].id,
							name:_configsJson[i].name,
							user:_configsJson[i].user,
							device:_configsJson[i].device,
							cols:_configsJson[i].cols,
							rows:_configsJson[i].rows,
							devices:_configsJson[i].devices
					};
					
					console.debug("Loading config " + con.id);
					
					_configs.push(con);
					
				  }
				  
				}, function(rejectMessage) {
				  console.debug(rejectMessage);
				});
			
		},

		/**
		 * Get complete configuration
		 */
		getConfigs : function() {
			return _configs;
		},

		/**
		 * Remove configuration for a given config
		 * @param {String} con
		 */
		removeConfig : function(con){

			if(_configs.indexOf(con) > -1){
				_configs.splice(_configs.indexOf(con), 1);
				return true;
			}else return false;

		}
		
	};

})());
