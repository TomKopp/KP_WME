Ext.namespace('Documa.plugins');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require("Documa.communication.commands.SystemCommand");

Documa.plugins.AbstractPlugin = Ext.extend(Object, (function() {

	var TAG = 'Documa.plugins.AbstractPlugin';

	var _log = Documa.util.Logger;

	var __pluginName = "";

	return {
		constructor : function(pluginName) {
			__pluginName = pluginName;
			try {
				// add instance into runtime environment context
				PhoneGap.addConstructor(function() {
					PhoneGap.addPlugin(pluginName, this);
				});
			} catch(error) {
				console.error('Failure during the initialization of plugin {' + pluginName + '}: ' + error);
			}
			// call superclass
			Documa.plugins.AbstractPlugin.superclass.constructor.call(this);
		},

		init : function() {
			Documa.util.Util.callNativeLayer(__pluginName, Documa.communication.commands.SystemClientCommands.INIT, this.onMessageRecieved, this.onInitFailure, []);
		},

		getName : function() {
			return this._pluginName;
		}

	};
})());
