Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');
Documa.require('Ext.cruise.client.Message');


Documa.communication.commands.PublishMessageCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {

	var TAG = "Documa.communication.commands.PublishMessageCommand";
	var _msg = null;
	var _log = null;

	return {

		constructor : function(message) {
			Documa.communication.commands.PublishMessageCommand.superclass.constructor.call(this);
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
				_log.debug(TAG, "... publishing remote message.");
				var am = Documa.RuntimeManager.getAwarenessManager();
				var eb = Documa.RuntimeManager.getEventBroker();
					if (eb && am){
						// get payload of publish message command
						var payload = _msg.getPayload();
						var cid = payload.cid;
						var sendername = payload.sendername? payload.sendername:"unknown";
						var params = payload.message.message.body;
						// rebuilt cruise message
						var message = new Ext.cruise.client.Message();
						message.setName(payload.message.message.header.name);
						message.setIsRemote(payload.message.message.header.isRemote);
						message.setMediationInfo(payload.message.message.header.mediationInfo);
						message.setBody(payload.message.message.body);
						// publish message on local event broker
						eb.publish(message,payload.cid);
						// notify user about change
						for ( var key in params) {
							var notificationString = sendername + " published " +  key + " of " + cid.substring(cid.lastIndexOf("/")+1);
							am.getAwarenessUtility().notify(notificationString);
						}
					}
				} catch(error) {
				_log.error(TAG, "ERROR: " + error);
			}
		}

	};
})());
