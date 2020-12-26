Ext.namespace("Documa.ui.meta");

Documa.require("Documa.util.Logger");
Documa.require("Documa.ui.meta.MainView");

/**
 * View layer of the metaui.
 * @class
 */
Documa.ui.meta.MetaUIView = Ext.extend(Object, (function(){
	var TAG = 'Documa.ui.meta.MetaUiView';
	var _log = Documa.util.Logger;
	var jq = jQuery;
	var MUI_MAINFRAME = 'csr-mui-mainframe-block';
	var MUI_SIDEPANEL = 'csr-mui-sidepanel-block';
	var MUI_MAINSTAGE = 'csr-mui-mainstage-block';
	var MUI_DEVICE = 'csr-ui-meta-device-deviceview';
	var MUI_DEVICEOWNER = 'csr-mui-deviceowner-block';
	var MUI_DISTRIBUTION = 'csr-mui-distribution-view-block';
	var _actualView = null;
	
	/**
	 * Helper method for checking the ready state of current meta-ui view.
	 *
	 * @param {Function} callback
	 */
	function whenReady(callback) {
		// name, id, version, initr, instid
		if(this._whenReady.fulfilled) {
			callback();
		} else {
			this._whenReady.then(function() {
				callback();
			}).catch(function(error) {
				LOG.error(TAG, error.stack);
			});
		}
	}
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {Documa.ui.meta.MetaUIController} controller
		 */
		constructor: function(controller){
			var self = this;
			/**
			 * @type {Documa.ui.meta.MetaUIController}
			 * @private
			 */
			this._controller = controller;

			/**
			 * @type {Documa.ui.meta.MainView}
			 * @private
			 */
			this._mainView = null;

			/**
			 * @type {Function}
			 * @private
			 */
			this._readyFn = null;

			/**
			 * @type {Promise}
			 * @private
			 */
			this._whenReady = new Promise(function(fulfill, reject){
				try {
					self._readyFn = function(){
						fulfill();
						self._whenReady.fulfilled = true;
					};
				} catch (error) {
					reject(error);
				}
			});

			/* extjs panel with main structur blocks */
			this._mainframePanel = new Ext.Container({
				id: MUI_MAINFRAME,
				layout: {
					type: 'fit'
				},
				border: false,
				style: {
					width: '100%',
					height: '100%'
				}
			});
		},

		/**
		 * Container and subview initialization.
		 * @returns {Promise}
		 */
		initialize: function(){
			var self = this;
			var childScope = Documa.Scope.$new(true, Documa.Scope);
			/**
			 * define controller attribute that should keep a
			 * reference to the metaui's start view
			 * @type {Documa.ui.meta.subview.StartView}
			 */
			childScope.controller = null;
			var compile = Documa.Compile;

			return new Promise(function(fulfill, reject){
				// create directive element of the metaui start view dynamically
				//var mui = jq("<metaui-start/>");
				var mui = jq("<meta-ui/>");

				// bind parent scope attribute to directive's scope
				mui.attr("controller", "controller");
				var mui_timeout = setTimeout(function(){
					reject(new Error("Metaui time out!"));
				}, 2000);

				// wait for loaded event of the whole meta ui
				childScope.$on(Documa.ui.meta.MetaUIEvents.MAIN_LOADED, function(){
					try {
						clearTimeout(mui_timeout);
						// broadcasting the main metaui controller downwards to each child scope
						childScope.$broadcast(Documa.ui.meta.MetaUIEvents.CTRLINIT, self._controller);
						fulfill();
						if (self._readyFn) {
							self._readyFn();
						}
					} catch (error) {
						_log.error(TAG, error.stack);
						reject(error);
					}
				});

				// start compilation of dynamically created directive
				var tplFn = compile(mui);
				childScope.$watch("controller", function(viewController){
					if (!viewController) return;
					_log.debug(TAG, "Set metaui main view controller!");
					self._mainView = viewController;
				});

				var mui_frame = jq("#" + MUI_MAINFRAME);
				mui_frame.append(tplFn(childScope));
			});
		},

		/**
		 * Returns main view container.
		 * @returns {Ext.Container}
		 */
		getContainer: function(){
			return this._mainframePanel;
		},

		/**
		 * Hides the main metaui view container.
		 */
		hide: function(){
			this._mainframePanel.hide();
		},

		/**
		 * Renders the main view container.
		 */
		show: function(){
			this._mainframePanel.doLayout();
			this._mainframePanel.show();
		},

		/**
		 * @returns {Promise}
		 */
		whenReady: function(){
			return this._whenReady;
		},

		/**
		 * @param {Documa.context.ApplicationContext} appcontext
		 */
		changeApplicationContext: function(appcontext){
			this._mainView.getDistributionView().changeApplicationContext(appcontext);
		},

		/**
		 * Adds application to the metaui.
		 * @param {string} id
		 * @param {string} name
		 * @param {string} version
		 */
		addLoadableApplication: function(id, name, version){
			var self = this;
			// name, id, version, initr, instid
			if (this._whenReady.fulfilled) {
				this._mainView.getStartView().getAppListView().addUserApp(name, id, version);
			} else {
				this._whenReady.then(function(){
					self._mainView.getStartView().getAppListView().addUserApp(name, id, version);
				}).catch(function(error){
					_log.error(TAG, error.stack);
				});
			}
		},

		/**
		 * @param {string} id application's identifier
		 * @param {string} name application's name
		 * @param {string} version application's version
		 * @param {String} initr application's initiator session
		 * @param {string} instid application's instance id
		 * @param {string} state application's lifecycle state
		 */
		addRunningApplication: function(id, name, version, initr, instid, state){
			let applistView = this._mainView.getStartView().getAppListView();
			if(applistView.containsJoinableApp(instid)) return;
			// name, id, version, initr, instid
			whenReady.call(this, () => {
				if(applistView.containsJoinableApp(instid)) {
					applistView.updateJoinableAppState(instid, state);
				} else {
					applistView.addJoinableApp(name, id, version, initr, instid, state);
				}
			});
		},

		/**
		 * @param {Documa.distribution.Device} device
		 */
		addVisibleDevice: function(device){
			let self = this;
			// name, id, version, initr, instid
			if (this._whenReady.fulfilled) {
				this._mainView.getStartView().getUsableDevicesView().addDevice(device);
			} else {
				this._whenReady.then(function(){
					self._mainView.getStartView().getUsableDevicesView().addDevice(device);
				}).catch(function(error){
					_log.error(TAG, error.stack);
				});
			}
		},

		/**
		 * @param {Documa.distribution.Device} device
		 */
		removeVisibleDevice: function(device){
			this._mainView.getStartView().getUsableDevicesView().removeDevice(device);
			var appconfig = this._mainView.getStartView().getAppConfigView();
			if (appconfig.containsRuntimeContainer(device)) {
				appconfig.removeRuntimeContainer(device);
			}
		},

		/**
		 * Adds device to the application space on the metaui layer.
		 * @param {Documa.context.ApplicationContext} appcontext
		 * @param {Documa.distribution.Device} device
		 */
		addApplicationDevice: function(appcontext, device){
			if (this._mainView.getDistributionView().getApplicationContext() !== appcontext) {
				throw new Error("Multiple application context are not supported yet!");
			}
			var self = this;
			var distributionView = this._mainView.getDistributionView();
			var distributionDialog = this._mainView.getComponentDistributionDialog();
			var readyPromise = distributionView.whenReady();
			if (readyPromise.fulfilled) {
				if (!distributionView.includesNode(device))
					distributionView.addDevice(device);
				if (!distributionDialog.containsDevice(device))
					distributionDialog.addDevice(device);
			} else {
				readyPromise.then(function(){
					if (!distributionView.includesNode(device))
						distributionView.addDevice(device);
					if (!distributionDialog.containsDevice(device))
						distributionDialog.addDevice(device);
				}).catch(function(error){
					_log.error(TAG, error.stack);
					Promise.reject(readyPromise);
				});
			}
		},

		/**
		 * @param {Documa.context.ApplicationContext} appcontext
		 * @param {Documa.distribution.Device} device
		 */
		removeApplicationDevice: function(appcontext, device){
			if (this._mainView.getDistributionView().getApplicationContext() !== appcontext) {
				throw new Error("Multiple application context are not supported yet!");
			}

			this._mainView.getDistributionView().removeDevice(device);
			this.getDistributionDialog().removeDevice(device);
		},

		/**
		 * Renders the application's distribution state using the distribution view.
		 * @param {Documa.context.ApplicationContext} appcontext
		 */
		showDistribution: function(appcontext){
			_log.debug(TAG, "Rendering application distribution");
			this._mainView.showDistributionView(appcontext);
		},

		/**
		 * Represents the updated distribution instance on the meta ui layer.
		 * @param {Documa.distribution.Distribution} distribution
		 */
		distributionChanged: function(distribution){
			var self = this;
			var promise = this._mainView.getDistributionView().whenReady();
			if (promise.fulfilled) {
				this._mainView.getDistributionView().updateDistribution(distribution);
			} else {
				promise.then(function(){
					self._mainView.getDistributionView().updateDistribution(distribution);
				}).catch(function(error){
					_log.error(TAG, error.stack);
				});
			}
		},

		/**
		 * Shows component distribution dialog that encapsulates the distributed component integration.
		 * @param {Array.<Documa.distribution.ComponentItem>} components
		 */
		showDistributionDialog: function(components){
			var cmpDistributionDialog = this._mainView.getComponentDistributionDialog();
			components.forEach(function(component){
				cmpDistributionDialog.addComponent(component);
			});
			// renders distribution dialog
			cmpDistributionDialog.show();
		},

		/**
		 * Clears and hides the component distribution dialog.
		 */
		hideDistributionDialog: function(){
			var cmpDistributionDialog = this._mainView.getComponentDistributionDialog();
			// remove all components from distribution dialog
			cmpDistributionDialog.clearComponents();
			cmpDistributionDialog.hide();
		},

		/**
		 * @returns {Documa.ui.meta.directives.DistributionDialog}
		 */
		getDistributionDialog: function(){
			return this._mainView.getComponentDistributionDialog();
		},

		/**
		 * Activates loader popup.
		 * @param {String} message
		 */
		showLoader: function(message){
			this._mainView.getLoaderView().show(message);
		},

		/**
		 * Hides loader popup.
		 */
		hideLoader: function(){
			this._mainView.getLoaderView().hide();
		}
	};
})());
