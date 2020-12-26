Ext.namespace("Documa.ui.meta.subview");


Documa.require("Documa.util.Util");
Documa.require("Documa.util.Logger");

/**
 * @typedef {Object} DataTransfer
 * @property {Function} getData
 * @property {Function} setData
 * @property {String} effectAllowed
 * @property {String} dropEffect
 * @property {Function} setDragImage
 */

/**
 * @typedef {MouseEvent} DragEvent
 * @property {DataTransfer} dataTransfer
 */

/**
 * @class
 */
Documa.ui.meta.subview.AppConfigView = Ext.extend(Object, function () {
	const TAG = "Documa.ui.meta.subview.AppConfigView";
	const _log = Documa.util.Logger;
	const _util = Documa.util.Util;
	const jq = jQuery;
	/////////////////////
	// private methods //
	/////////////////////


	/**
	 * Helper method for navigating and activating the distribution view.
	 * @param {Documa.context.ApplicationContext} appcontext
	 */
	function activateDistributionView(appcontext){
		// fires distribution activate event
		this._scope.$emit(Documa.ui.meta.MetaUIEvents.DISTVIEW_ACTIVATED, appcontext);
	}

	/**
	 * Preventing the default behaviour on dropping data items onto the container dropzone.
	 * @param {MouseEvent} event
	 */
	function allowDrop(event) {
		event.preventDefault();
	}

	/**
	 * Illegal drag image element.
	 * @returns {Element}
	 */
	function getIllegalDragImage() {
		return jq("<span class='glyphicon glyphicon-ban-circle'></span>").get(0);
	}

	/**
	 * Called after the mouse hovers over the container panel.
	 * @param {jQuery.Event} event
	 */
	function onMouseOverContainerPanel(event) {
		//_log.debug(TAG, "Mouse over container!");
		this._overContainerPanel = true;
	}

	/**
	 * Called after the mouse leaves the container panel.
	 * @param {jQuery.Event} event
	 */
	function onMouseLeaveContainerPanel(event) {
		//_log.debug(TAG, "Mouse left container!");
		this._overContainerPanel = false;
	}

	/**
	 * Called on entering the container panel while dragging a usable device into the application configuration.
	 * @param {DragEvent} event
	 */
	function onContainerDragEnter(event) {
		// get session id from drag event
		/** @type {string} */
		var sessionid = event.dataTransfer.getData(Documa.ui.meta.DnD.TEXT);
		if (!sessionid || sessionid.length == 0) {
			event.stopImmediatePropagation();
			event.dataTransfer.setDragImage(getIllegalDragImage(), -10, -10);
			return false;
		}
		// get device from MetaUI Controller using the sessionid
		var device = this._environment.getDevice(sessionid);
		if (this.containsRuntimeContainer(device)) {
			event.stopImmediatePropagation();
			event.dataTransfer.setDragImage(getIllegalDragImage(), -10, -10);
			return false;
		}
	}

	/**
	 * Called after a device element was dragged over the config's container panel.
	 * @param {DragEvent} event
	 */
	function onContainerDragOver(event) {
		//_log.debug(TAG, "Dragging over!");
		var self = this;
		this._overContainerPanel = true;
		// get session id from drag event
		/** @type {string} */
		var sessionid = event.dataTransfer.getData(Documa.ui.meta.DnD.TEXT);
		if (!sessionid || sessionid.length == 0) {
			event.stopImmediatePropagation();
			event.dataTransfer.setDragImage(this._illegalDragImg, -10, -10);
			return false;
		}
		// get device from MetaUI Controller using the sessionid
		var device = this._environment.getDevice(sessionid);
		if (this.containsRuntimeContainer(device)) {
			event.stopImmediatePropagation();
			event.dataTransfer.setDragImage(this._illegalDragImg, -10, -10);
			return false;
		}
	}

	/**
	 * @param {DragEvent} event
	 */
	function onContainerDragLeave(event) {
		this._overContainerPanel = false;
	}

	/**
	 * Called after a device element was dropped onto the config's container panel.
	 * @param {DragEvent} event
	 */
	function onContainerDropped(event) {
		// getting session id from drag/drop event
		/** @type {string} */
		var sessionid = event.dataTransfer.getData(Documa.ui.meta.DnD.TEXT);
		if (!sessionid || sessionid.length == 0) {
			event.stopPropagation();
			return false;
		}
		// get device from MetaUI Controller using the sessionid
		var device = this._environment.getDevice(sessionid);
		if (this.containsRuntimeContainer(device)) {
			event.stopPropagation();
			return false;
		}
		this.addRuntimeContainer(device);
		return false;
	}

	/**
	 * Called after a container item was dragged.
	 * @param {DragEvent} event
	 * @param {Documa.distribution.Device} device
	 */
	function onContainerItemDrag(event, device) {
		// if an application should be created it requires at least a single
		// device
		if (this._scope.containers.length == 1) {
			event.stopImmediatePropagation();
			return false;
		}
		this._currentContainerItem = device;
	}

	/**
	 * Called after a the drag movement ended.
	 * @param {DragEvent} event
	 */
	function onContainerItemDragEnd(event) {
		//_log.debug(TAG, "Dragging ends!");
		if (!this._overContainerPanel && this._currentContainerItem) {
			// if an application should be created it requires at least a single
			// device
			if (this._scope.containers.length == 1) {
				event.stopImmediatePropagation();
				return false;
			}
			this.removeRuntimeContainer(this._currentContainerItem);
		}
		this._currentContainerItem = null;
	}

	/**
	 * Triggers the creation of an application context on client and server-side.
	 */
	function createApplication() {
		/** @type {String} */
		let appid = this._app_id;
		/** @type {String} */
		let appName = this._scope.appName;
		let appVersion = "0.1";
		/** @type {String} */
		let appDescr = this._scope.appDescr;
		/** @type {Array.<Documa.distribution.Device>} */
		let containers = this._scope.containers;

		if (!this._mainController)
			throw new Error("MetaUI controller not initialized!");

		let self = this;
		// trigger the creation of a distributed application context
		this._mainController.createApplication(appid, appName, appVersion, containers, this._scope.testcase).then(
			/**
			 * @param {Documa.context.ApplicationContext} applicationContext
			 */
			function(applicationContext){
				// application context created
				_log.debug(TAG, "Application created!");

				// set current application context at current metaui state
				self._mainController.getState().setApplicationContext(applicationContext);

				// fire distribution view activate event
				self._mainController.getState().configureDistribution();
			}).catch(function(error){
				_log.error(TAG, error.stack);
			});
	}

	/**
	 * Clears current settings with the application configurator.
	 */
	function clearSettings(){
		var self = this;
		/** @type {Array.<Documa.distribution.Device>} */
		var containers = [];
		self._scope.containers.forEach(function(device){
			containers.push(device);
		});
		/**
		 * @param {Array.<Documa.distribution.Device>} darray
		 * @param {Number} index
		 * @param {Function} callback
		 */
		var clearContainers = function(darray, index, callback){
			if (index >= darray.length) {
				callback();
				return;
			}
			try {
				var device = darray[index];
				self.removeRuntimeContainer(device).then(function(){
					clearContainers(darray, index + 1, callback);
				});
			} catch (error) {
				reject(error);
			}
		};

		clearContainers(containers, 0, function(){
			self._scope.$applyAsync(function(){
				self._scope.appName = null;
				self._scope.appDescr = null;
				self._app_name = null;
				self._app_descr = null;
				self._app_id = uuid.v1();

				var host = Documa.RuntimeManager.getRuntimeContext().getDevice();
				self.addRuntimeContainer(host);
			});
		});
	}

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {$compile} compile
		 */
		constructor: function (compile) {
			Documa.ui.meta.subview.AppConfigView.superclass.constructor.call(this);
			this._compile = compile;
			/**
			 * @type {Documa.ui.meta.MetaUIController}
			 * @private
			 */
			this._mainController = null;
			this._illegalDragImg = getIllegalDragImage();

			/**
			 * flag representing mouse over container panel state
			 * @type {boolean}
			 * @private
			 */
			this._overContainerPanel = false;
			/**
			 * @type {Documa.distribution.Device}
			 * @private
			 */
			this._currentContainerItem = null;

			/**
			 * application id
			 * @type {string}
			 * @private
			 */
			this._app_id = uuid.v1();

			/**
			 * application name
			 * @type {string}
			 * @private
			 */
			this._app_name = null;
			/**
			 * application description
			 * @type {string}
			 * @private
			 */
			this._app_descr = null;

			/**
			 * @type {Documa.context.EnvironmentContext}
			 * @private
			 */
			this._environment = Documa.RuntimeManager.getEnvironmentContext();
		},

		/**
		 * Controller init.
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} element
		 * @param {Object} attr
		 */
		setup: function (scope, element, attr) {
			this._scope = scope;
			this._elem = element;
			this._attr = attr;

			this._scope.appName = null;
			this._scope.appDescr = null;
			
			// define test case constants
			this._scope.DEFAULT = 0;
			this._scope.MIGR_OPTIONS = Documa.context.TestCases.MIGRATION_OPTIONS;

			// handle drop events on dragging things over the container dropzone panel
			this._scope.allowDrop = allowDrop.bind(this);
			this._scope.onContainerDragOver = onContainerDragOver.bind(this);
			this._scope.onContainerDragEnter = onContainerDragEnter.bind(this);
			this._scope.onContainerDragLeave = onContainerDragLeave.bind(this);
			this._scope.onContainerDropped = onContainerDropped.bind(this);
			this._scope.onContainerItemDrag = onContainerItemDrag.bind(this);
			this._scope.onContainerItemDragEnd = onContainerItemDragEnd.bind(this);
			this._scope.onMouseOverContainerPanel = onMouseOverContainerPanel.bind(this);
			this._scope.onMouseLeaveContainerPanel = onMouseLeaveContainerPanel.bind(this);
			/**
			 * Application runtime containers.
			 * @type {Array.<Documa.distribution.Device>}
			 */
			this._scope.containers = [];

			// register application creation hander
			this._scope.createApp = createApplication.bind(this);
			this._scope.clearSettings = clearSettings.bind(this);
			this._scope.testcase = 0;

			// init config view
			let currentDevice = Documa.RuntimeManager.getRuntimeContext().getDevice();
			this.addRuntimeContainer(currentDevice);
		},

		/**
		 * Sets metaui's main controller.
		 * @param {Documa.ui.meta.MetaUIController} controller
		 */
		setMainController: function (controller) {
			this._mainController = controller;
		},

		/**
		 * Adds device as runtime container to current new application configuration.
		 *
		 * @param {Documa.distribution.Device} device
		 * @returns {Promise}
		 */
		addRuntimeContainer: function (device) {
			let self = this;
			return new Promise(function(resolve, reject){
				self._scope.$applyAsync(function(){
					try {
						self._scope.containers.push(device);
						resolve();
					} catch (error) {
						reject(error);
					}
				});
			});
		},

		/**
		 * Tests whether current application config already contains the specified device.
		 * @param {Documa.distribution.Device} device
		 * @returns {boolean} true if current application config
		 *                    already contains the specified device, else false
		 */
		containsRuntimeContainer: function (device) {
			for (var i = 0; i < this._scope.containers.length; ++i) {
				/** @type {Documa.distribution.Device} */
				var cur_dev = this._scope.containers[i];
				if (cur_dev.getSessionId() === device.getSessionId()) {
					return true;
				}
			}
			return false;
		},

		/**
		 * Removes device from current application configuration.
		 * @param {Documa.distribution.Device} device
		 * @returns {Promise}
		 */
		removeRuntimeContainer: function (device) {
			_log.debug(TAG, "Removing device: " + device.getDeviceName());
			var delindex = -1;
			var self = this;
			return new Promise(function(resolve, reject){
				for (var i = 0; i < self._scope.containers.length; ++i){
					/** @type {Documa.distribution.Device} */
					var cur_dev = self._scope.containers[i];
					if (cur_dev.getSessionId() === device.getSessionId()) {
						delindex = i;
						break;
					}
				}
				if (delindex < 0)
					reject(new Error("Can not delete device: " + device.getDeviceName()));

				// remove current from ui layer
				self._scope.$applyAsync(function(){
					_util.remove(delindex, self._scope.containers);
					resolve();
				});
			});
		}
	};
}());

/**
 * View definition element.
 */
Documa.CSRM.directive("muiAppConfigView", function ($compile) {
	return {
		restrict: "E",
		templateUrl: "lib/documa/ui/templates/mui_appconfig.html",
		scope: {
			// add element attributes
			controller: "="
		},
		link: function ($scope, element, attr) {
			var controller = new Documa.ui.meta.subview.AppConfigView($compile);
			controller.setup($scope, element, attr);
			$scope.$applyAsync(function () {
				// setting app config controller and notifying watching parents
				$scope.controller = controller;
			});
		}
	};
});