Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');
Documa.require('Ext.cruise.client.Message');
Documa.require('Documa.communication.protocol.Operation');


Documa.communication.commands.SetPropertyMessageCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {

	var TAG = "Documa.communication.commands.SetPropertyMessageCommand";
	var _msg = null;
	var _log = null;

	return {

		constructor : function(message) {
			Documa.communication.commands.SetPropertyMessageCommand.superclass.constructor.call(this);
			_msg = message;
			_log = Documa.util.Logger;
		},

		destructor : function() {
			_log.debug(TAG, "... releasing resources.");
			_msg = null;
			_log = null;
		},

		/**
		 * Method should take list of applications received from the server and present
		 * them in an appropriate way.
		 */
		execute : function() {
			try {
				
				_log.debug(TAG, "... execute set property");
				// get payload of publish message command
				var payload = _msg.getPayload();
				var cid = payload.cid;
				var sendername = payload.sendername? payload.sendername:"unknown";
				var params = payload.message.message.body;
				var am = Documa.RuntimeManager.getAwarenessManager();
				var cm = Documa.RuntimeManager.getComponentManager();
					if (cm && am){
						// get component to call
						//TODO work with instance id instead of component id
						var instance = cm.getComponentInstance(cid);
						for ( var key in params) {
							// only apply something if the property is different to the current prop value
							if(instance.getProperty(key) != params[key]){
								//change property of component
								instance.setProperty(key, params[key]);
								//notify user about the property changing
								//TODO only do notification if user != current user
								var notificationString = sendername + " changed " +  key + " of " + cid.substring(cid.lastIndexOf("/")+1);
								am.getAwarenessUtility().notify(notificationString);
							}
						}
					}
				} catch(error) {
				_log.error(TAG, "ERROR: " + error);
			}
		}

	};
})());
