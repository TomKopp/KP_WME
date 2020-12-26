Ext.namespace("Documa.ui.meta.subview");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

/**
 * @typedef {Object} App
 * @property {String} id
 * @property {String} name
 * @property {String} version
 * @property {String} instid
 * @property {String} state
 */


/**
 * Presents loadable and running applications as part of the metaui's start view.
 * @class
 */
Documa.ui.meta.subview.AppListView = Ext.extend(Object, function(){
	const TAG = "Documa.ui.meta.subview.AppListView";
	const LOG = Documa.util.Logger;
	const UTIL = Documa.util.Util;
	
	///////////////////////
	// Private functions //
	///////////////////////
	/**
	 * Starts loading the selected application.
	 * @param {String} id
	 * @param {String} name
	 * @param {String} version
	 */
	function loadApplication(id, name, version){
		if(!this._mainController)
			throw new Error("Error during composition loading: Undefined metaui controller!");
		let appinstid = uuid.v1();
		let self = this;
		// start loading a predefined application
		this._mainController.loadComposition(id, name, version).then((appcontext) => {
			LOG.debug(TAG, "Application starting!");
			self._mainController.getState().setApplicationContext(appcontext);
			
			// fire distribution view activate event
			self._mainController.getState().configureDistribution();
		}).catch((error) => {
			LOG.error(TAG, error.stack);
		});
	}
	
	
	/**
	 * Joins an active multi-device application.
	 *
	 * @param {String} id
	 * @param {String} name
	 * @param {String} version
	 * @param {String} instid
	 * @param {String} state
	 */
	function joinApplication(id, name, version, instid, state){
		if(!this._mainController)
			throw new Error("Error during composition loading: Undefined metaui controller!");
		// start joining the application context
		this._mainController.joinApp(id, name, version, instid, state);
	}
	
	//////////////////////
	// Public functions //
	//////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function(compile){
			this._compile = compile;
			this._scope = null;
			this._elem = null;
			
			/**
			 * @type {Documa.ui.meta.MetaUIController}
			 * @private
			 */
			this._mainController = null;
		},
		
		/**
		 * Adds user specific application to the app list view.
		 * @param {String} name
		 * @param {String} id
		 * @param {String} version
		 */
		addUserApp: function(name, id, version){
			let self = this;
			this._scope.$applyAsync(function(){
				self._scope.userApps.push({name: name, id: id, version: version});
			});
		},
		
		/**
		 * Initiates current application view.
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		setup: function(scope, elem, attr){
			this._scope = scope;
			this._elem = elem;
			
			// init application registers
			/**
			 *
			 * @type {Array.<{name:string, id:string, version:string}>}
			 */
			this._scope.userApps = [];
			this._scope.joinableApps = [];
			
			// assign load application click event handler
			this._scope.loadApp = loadApplication.bind(this);
			// assign join application click event handler
			this._scope.joinApp = joinApplication.bind(this);
		},
		
		/**
		 * Sets metaui's main controller.
		 * @param {Documa.ui.meta.MetaUIController} controller
		 */
		setMainController: function(controller){
			this._mainController = controller;
		},
		
		/**
		 * Clears the list of loadable user-specific applications.
		 */
		clearUserApps: function(){
			let self = this;
			this._scope.$applyAsync(function(){
				self._scope.userApps = [];
			});
		},
		
		/**
		 * Adds user-specific joinable application to the app list view.
		 * @param {String} name
		 * @param {String} id
		 * @param {String} version
		 * @param {String} initr
		 * @param {String} instid
		 * @param {String} state
		 */
		addJoinableApp: function(name, id, version, initr, instid, state){
			let self = this;
			this._scope.$applyAsync(function(){
				self._scope.joinableApps.push({
					name: name,
					id: id,
					version: version,
					creator: initr,
					instid: instid,
					state: state
				});
			});
		},
		
		/**
		 * Clears the list of joinable user-specific applications.
		 */
		clearJoinableApps: function(){
			let self = this;
			this._scope.$applyAsync(function(){
				self._scope.joinableApps = [];
			});
		},
		
		/**
		 * Updates state of currently active joinable application.
		 *
		 * @param {String} instid
		 * @param {String} state
		 */
		updateJoinableAppState: function(instid, state) {
			let self = this;
			
			/** @type {Array.<App>} */
			let joinableApps = this._scope.joinableApps;
			
			let app = joinableApps.find((app) => app.instid === instid);
			if(!app) {
				// no running application with given instance id available
				return;
			}
			
			this._scope.$applyAsync(() => {
				app.state = state;
			})
		},
		
		/**
		 * Removes active joinable application.
		 *
		 * @param {String} instid
		 */
		removeJoinableApp: function(instid) {
			let self = this;
			let joinableApps = this._scope.joinableApps;
			
			/** @type {Array.<App>} */
			let app = joinableApps.find((app) => app.instid === instid);
			if(!app)
				throw new Error(`No joinable application with id ${instid}`);
			
			this._scope.$applyAsync(() => {
				UTIL.removeElement(app, self._scope.joinableApps);
			})
		},
		
		/**
		 * Tests whether an application with given instance id is already available.
		 *
		 * @param {String} instid
		 * @returns {Boolean}
		 */
		containsJoinableApp: function(instid) {
			/** @type {Array.<App>} */
			let joinableApps = this._scope.joinableApps;
			return (joinableApps.findIndex((app) => app.instid === instid) >= 0);
		}
	};
}());

Documa.CSRM.directive("muiApplications", function($compile){
	return {
		restrict: "E",
		templateUrl: "lib/documa/ui/templates/mui_apps.html",
		scope: {
			// add element attributes
			controller: "="
		},
		link: function($scope, elem, attr){
			let applist = new Documa.ui.meta.subview.AppListView($compile);
			applist.setup($scope, elem, attr);
			$scope.$applyAsync(function(){
				$scope.controller = applist;
			});
		}
	};
});