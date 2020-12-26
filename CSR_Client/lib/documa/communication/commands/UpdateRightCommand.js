Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');

Documa.communication.commands.UpdateRightCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {

	var TAG = "Documa.communication.commands.UpdateRightCommand";
	var _log = null;
	var _instance = null;
	var _acl = null;
	var _accessControlManager = null;
	
	
	return {

		constructor : function(message) {
			Documa.communication.commands.UpdateRightCommand.superclass.constructor.call(this);
			_log = Documa.util.Logger;
			_instance = message.getPayload().instance;
			_acl = message.getPayload().acl;
			_accessControlManager = Documa.RuntimeManager.getAccessControlManager();
		},

		destructor : function() {
			_log.debug(TAG, "... releasing resources.");
			_log = null;
			_acl = null;
			_instance = null;
			_accessControlManager = null;
		},

		execute : function() {
			try {
				_log.debug(TAG, "... execute update right");
				var currentUser = _accessControlManager.getUserId();
				for(user in _acl){
					if(user == currentUser){
						_accessControlManager.updateUserRight(_instance, _acl[user]);	
					}else{
						_accessControlManager.updateACL(_instance, user, _acl[user]);	
					}
				}
			} catch(error) {
				_log.error(TAG, "ERROR: " + error);
			}
		}

	};
})());
