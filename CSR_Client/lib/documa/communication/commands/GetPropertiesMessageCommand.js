Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');


Documa.communication.commands.GetPropertiesMessageCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {

	var TAG = "Documa.communication.commands.GetPropertiesMessageCommand";
	var _log = null;
	var _msg = null;
	
	return {

		constructor : function(message) {
			Documa.communication.commands.GetPropertiesMessageCommand.superclass.constructor.call(this);
			_msg = message;
			_log = Documa.util.Logger;
		},

		destructor : function() {
			_log.debug(TAG, "... releasing resources.");
			_msg = null;
			_log = null;
		},

		execute : function() {
			try {
				
				_log.debug(TAG, "... execute get properties");
				
				var payload = _msg.getPayload();
				var instance = payload.instance;
				var propertiesNames = payload.propertiesnames;
				
				var cm = Documa.RuntimeManager.getComponentManager();
				var istanceObj = cm.getInstance(instance);
				
				var properties = {};
				for (var i = 0; i < propertiesNames.length; i++){
					var property = istanceObj.getProperty(propertiesNames[i]);
					//_log.debug(TAG, "Property Name {"+propertiesNames[i]+"} - Property Value {"+property+"}");
					properties[propertiesNames[i]] = property;
				}
								
				var msg = new Ext.cruise.client.Message();
				msg.setName("propertiesChanged");
				msg.setBody(properties);
				var container = cm.getContainerElementById(instance);
				var cid = container.getComponentID();
			
				Documa.RuntimeManager.getEventBroker().publish(msg, cid);

			} catch(error) {
				_log.error(TAG, "ERROR: " + error);
			}
		}

	};
})());
