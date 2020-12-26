Ext.namespace("Documa.interrupt");

Documa.require('Documa.util.Logger');
Documa.require('Documa.interrupt.AppInterrupt');
Documa.require('Documa.interrupt.InterruptView');
Documa.require('Documa.communication.commands.CommandFactory');
Documa.require('Documa.communication.events.EventFactory');

/**
 * Singleton interrupt handler class to react on application interruption events
 * from server-side.
 */
Documa.interrupt.InterruptController = Ext.extend(Object, (function() {

	var TAG = "Documa.interrupt.InterruptController";
	var _log = Documa.util.Logger;
	var _cf = null;
	var _ef = null;
	
	function isEqualApplication(appContext, interrpt){
		var ctxt_appid = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
		var ctxt_appvers = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
		return (ctxt_appid === interrpt.getApplicationId() && ctxt_appvers === interrpt.getApplicationVersion());
	}

	return {
		constructor : function() {
			Documa.interrupt.InterruptController.superclass.constructor.call(this);
			_cf = new Documa.communication.commands.CommandFactory();
			_ef = new Documa.communication.events.EventFactory();
		},

		/**
		 * Method gets called after an application interruption event occurs on
		 * server-side and was received on the client-side.
		 *
		 * @param {Documa.communication.events.ApplicationEvent} interrptEvent event
		 * representing interruption state of application on server-side
		 */
		onInterrupt : function(interrptEvent) {
			_currentInterrupt = new Documa.interrupt.AppInterrupt(interrptEvent.getPayload());
			_log.debug(TAG, "... received server-side interruption event with cause {" + _currentInterrupt.getCause() + "}, description {" + _currentInterrupt.getDescription() + "}");

			// check if current application context is the same in the interruption event
			var appContext = Documa.RuntimeManager.getApplicationContext();
			
			if(!isEqualApplication(appContext, _currentInterrupt)){
				throw new Error("Wrong application interrupt received");
			}
			
			// interruption decision is only possible for applications initiator
			this._view = new Documa.interrupt.InterruptView(_currentInterrupt, this);
			
			if(!appContext.initiatedByClient()){
				this._view.showWaitingView();
			} else {
				this._view.showInterruptionView();	
			}
		},
		
		/**
		 * Releases all resources that ensures the application's interruption. 
		 */
		release : function() {
			this._view.closeInterruptionView();
			this._view.closeWaitingView();
		},

		/**
		 * Method is called after the user wants to close the application on interruption event.
		 *
		 * @param {Ext.Window} view window object presenting interruption event to the user
		 * @param {Documa.interrupt.AppInterrupt} interrupt object containing interruption information
		 */
		closeApplication : function(view, interrupt) {
			_log.debug(TAG, "... sending close application command on interrupt cause {" + interrupt.getCause() + "}");

			// create close command and send it to the server-side
			// getting require objects and application parameter
			var communicationManager = Documa.RuntimeManager.getCommunicationManager();
			var appContext = Documa.RuntimeManager.getApplicationContext();
			var appid = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
			var appVersion = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
			var appInstid = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
			var self = this;

			Ext.MessageBox.confirm("Confirm", "Closing application with id {" + appid + "} and version {" + appVersion + "}", function(button) {
				if (button === "yes") {
					// create pause command  and send it to the server-side
					var cmd = _cf.createApplicationCloseCommand(appid, appVersion, appInstid);
					communicationManager.sendSystemLevelMessage(cmd);
					_log.debug(TAG, "... closing of application confirmed.");
					self._view.closeInterruptionView();
				} else {
					_log.debug(TAG, "... no confirmation of closing application command.");
				}
			}, this);
		},

		/**
		 * Method is called after the user wants to wait after the interruption event occurs.
		 *
		 * @param {Ext.Window} view window object presenting interruption event to the user
		 * @param {Documa.interrupt.AppInterrupt} interrupt object containing interruption information
		 */
		pauseApplication : function(view, interrupt) {
			_log.debug(TAG, "... sending pause application command on interrupt cause {" + interrupt.getCause() + "}");

			// getting require objects and application parameter
			var communicationManager = Documa.RuntimeManager.getCommunicationManager();
			var appContext = Documa.RuntimeManager.getApplicationContext();
			var appid = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
			var appVersion = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
			var appctime = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
			var self = this;

			Ext.MessageBox.confirm("Confirm", "Pausing application with id {" + appid + "} and version {" + appVersion + "}", function(button) {

				if (button === "yes") {
					// create pause command  and send it to the server-side
					var cmd = _cf.createApplicationPauseCommand(appid, appVersion, appctime, interrupt.getCause());
					communicationManager.sendSystemLevelMessage(cmd);
					_log.debug(TAG, "... pausing of application confirmed.");
					self._view.closeInterruptionView();
					self._view.showWaitingView();

					// after command was sent to the server-side let all listening 
					// middleware components know that the application is in waiting 
					// state
					
					// create client-side application waiting event
					/*var waitEvent = _ef.create(Documa.communication.MessageFieldValues.APP_LEVEL, 
						Documa.communication.events.ApplicationEvents.PAUSING, {
						appid : appid,
						appvrs : appVersion,
						appname : appname
					});*/
					
					// dispatch event
					/*Documa.RuntimeManager.getEventDispatcher().dispatchEvent(waitEvent);*/
				} else {
					_log.debug(TAG, "... no confirmation of pausing application command.");
				}
			}, this);
		}

	};
})());
