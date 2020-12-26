Ext.namespace("Documa.interrupt");

Documa.require("Documa.util.Logger");

Documa.interrupt.InterruptView = Ext.extend(Object, (function() {

	var TAG = "Documa.interrupt.InterruptionView";
	var _log = Documa.util.Logger;

	function createWindow(interrupt, controller) {
		var content = "<p>" + interrupt.getDescription() + "</p>";
		var self = this;
		return new Ext.Window({
			layout : 'fit',
			renderTo : Ext.getBody(),
			closeAction : 'hide',
			closeable : false,
			tools : [{
				id : 'close',
				hidden : true,
				handler : function(e, target, panel) {
					// nothing todo here
				}

			}],
			width : 500,
			height : 200,
			modal : true,
			items : [{
				xtype : 'panel',
				title : 'Application Interrupting Cause',
				label : 'Cause of interruption',
				name : 'cause',
				flex : 1,
				html : content
			}],
			buttons : [{
				text : 'Close Application',
				handler : function() {
					controller.closeApplication(self, interrupt);
				}

			}, {
				text : 'Pause Application',
				handler : function() {
					controller.pauseApplication(self, interrupt);
				}

			}]
		});
	}

	return {
		/**
		 * Constructor of InterruptionView class.
		 *
		 * @param {Documa.interrupt.AppInterrupt} interrupt object describing interruption event from server-side
		 */
		constructor : function(interrupt, controller) {
			Documa.interrupt.InterruptView.superclass.constructor.call(this);
			this._interruptObj = interrupt;
			this._controller = controller;
			this._interruptionView = createWindow.call(this, interrupt, controller);
		},

		showInterruptionView : function() {
			_log.info(TAG, "... showing interruption");
			this._interruptionView.show();
		},

		closeInterruptionView : function() {
			this._interruptionView.close();
		},

		showWaitingView : function() {
			// create cycling runner
			var waitingBar = new Ext.ProgressBar({
				id : 'pBar',
				text : "Waiting ...",
			});

			// create runners modal container window
			this._waitingWindow = new Ext.Window({
				layout : 'fit',
				modal : true,
				width : 500,
				tools : [{
					id : 'close',
					hidden : true
				}],
				items : waitingBar,
				buttons : [{
					text : 'Cancel',
					handler : function() {
						throw new Error("Not implemented yet!");
					}

				}],
				renderTo : Ext.getBody()
			});

			var appName = Documa.RuntimeManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_NAME);
			this._waitingWindow.show();
			waitingBar.wait({
				interval : 800,
				animate : true,
				text : 'Application {' + appName + '} is waiting ...'
			});
		},

		closeWaitingView : function() {
			this._waitingWindow.close();
		}

	};
})());
