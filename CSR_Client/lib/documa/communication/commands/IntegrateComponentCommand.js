Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');

/**
 * @class
 * @extends {Documa.communication.commands.ExecutableCommand}
 */
Documa.communication.commands.IntegrateComponentCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function(){
	const TAG = "Documa.communication.commands.IntegrateComponentCommand";
	const LOG = Documa.util.Logger;

	function validateComponentConfiguration(compConfig){
		if (!compConfig.id)
			throw new Error("Missing instance id in component configuration payload!");
		if (!compConfig.operations)
			throw new Error("Missing operations field in component configuration payload!");
		if (!compConfig.properties)
			throw new Error("Missing properties field in component configuration payload!");
		if (!compConfig.channelpts)
			throw new Error("Missing channel endpoints field in component configuration payload!");
	}

	return {
		/**
		 * Constructor.
		 *
		 * @param {Documa.communication.Message} message
		 */
		constructor: function(message){
			Documa.communication.commands.IntegrateComponentCommand.superclass.constructor.call(this);
			this._msg = message;
		},

		destructor: function(){
			LOG.debug(TAG, "... releasing resources.");
			delete this._msg;
			this._msg = null;
		},

		execute: function(){
			try {
				var payload = this._msg.getPayload();
				if (!payload.smcd)
					throw new Error("No component descriptor in INTEGRATE COMPONENT command defined!");
				if (!payload.config)
					throw new Error("No component configuration in INTEGRATE COMPONENT command defined!");
				if (!payload.type)
					throw new Error("No integration type in INTEGRATE COMPONENT command defined!");
				if (!payload.jobid)
					throw new Error("No job id in INTEGRATE COMPONENT command defined!");
				validateComponentConfiguration(payload.config);
				// TODO: get application context from message and retrieve the component manager
				// from the determined application context
				let doc = Ext.cruise.client.Utility.parseXMLFromString(payload.smcd);
				let compConfig = payload.config;
				let descriptor = doc.querySelector("component");
				let componentManager = Documa.RuntimeManager.getComponentManager();
				let componentid = descriptor.getAttribute("id");
				LOG.debug(TAG, "... registering component with id {" + componentid + "}");
				// call the runtime manager to register the component descriptor for later
				// integration
				componentManager.registerComponent(payload.jobid, payload.type, descriptor, compConfig);
			} catch (error) {
				LOG.error(TAG, " ERROR: " + error.stack);
			}
		}

	};
})());
