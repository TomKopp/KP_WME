Ext.namespace('Documa.context.states');

Documa.require('Documa.util.Logger');
Documa.require('Documa.context.states.ApplicationState');

Documa.context.states.ApplicationPausing = Ext.extend(Documa.context.states.ApplicationState, (function() {
	var TAG = "Documa.context.states.ApplicationPausing";
	var _log = Documa.util.Logger;
	return {
		constructor : function(appContext) {
			Documa.context.states.ApplicationPausing.superclass.constructor.call(this, appContext);
		},

		start : function(startEvent) {
			_log.debug(TAG,"... calling start");
			this._context.getInterruptController().release();
			var startingState = this._context.getStartingState();
			this._context.setState(startingState);
			startingState.start(startEvent);
		},
		
		run : function(runEvent) {
			_log.debug(TAG,"... calling run");
			this._context.getInterruptController().release();
			var runningState = this._context.getRunningState();
			this._context.setState(runningState);
			runningState.run(runEvent);
		},

		close : function(closeEvent) {
			_log.debug(TAG,"... calling close");
			this._context.getInterruptController().release();
		},

		pause : function(pauseEvent) {
			_log.debug(TAG,"... calling pause");
			_log.debug(TAG,"... application is already in pausing state!");
		},
		
		join : function(joinEvent){
			_log.debug(TAG,"... calling join");
			if(joinEvent){
				// join event triggered from server-side runtime environment
				this.handleJoinEvent(joinEvent);
			}else {
				throw new Error("Empty join event detected during appliation's pausing state!");
			}
		},
		
		leave : function(leaveEvent){
			_log.debug(TAG,"... calling leave");
			// TODO: handle leaving during pausing state
			throw new Error("Leave method not implemented!");
		},
		
		updateDistribution : function(updateEvent) {
			_log.debug(TAG,"... calling updateDistribution");
			throw new Error("Update distribution method not implemented!");
		},
		
		addComponent : function(addEvent) {
			_log.debug(TAG,"... calling addComponent");
			throw new Error("Add component method not implemented!");
		},
		
		removeComponent : function(removeEvent) {
			_log.debug(TAG,"... calling removeComponent");
			throw new Error("Remove component method not implemented!");
		}
	};
})());
