/**
 * Created by oliver on 08.08.15.
 */
Ext.namespace("Documa.ui.meta.subview");

Documa.require("Documa.util.Logger");
Documa.require("Documa.ui.meta.subview.AppListView");
Documa.require("Documa.ui.meta.subview.DevicePanelView");
Documa.require("Documa.ui.meta.subview.AppConfigView");
Documa.require("Documa.ui.meta.subview.UsableDevicesView");

/**
 * @class MetaUI angularjs directive.
 */
Documa.ui.meta.subview.StartView = Ext.extend(Object, function(){
	var TAG = "Documa.ui.meta.subview.StartView";
	var _log = Documa.util.Logger;
	var jq = jQuery;

	var CSR_MUI_LTABS = "csr-mui-lefttabs";

	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {$compile} compile
		 */
		constructor: function(compile){
			this._compile = compile;
			this._scope = null;
			this._elem = null;
			this._attr = null;

			/**
			 * @type {Documa.ui.meta.MetaUIController}
			 * @private
			 */
			this._mainController = null;
		},

		/**
		 * Setup meta ui's variable scope.
		 *
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		setup: function(scope, elem, attr){
			this._scope = scope;
			this._elem = elem;
			this._attr = attr;
			var self = this;
			/**
			 * @type {Documa.ui.meta.subview.AppListView}
			 * @private
			 */
			this._applist = null;

			/**
			 * @type {Documa.ui.meta.subview.DevicePanelView}
			 * @private
			 */
			this._currentDeviceView = null;

			/**
			 * @type {Documa.ui.meta.subview.AppConfigView}
			 * @private
			 */
			this._appConfigView = null;

			/**
			 * @type {Documa.ui.meta.subview.UsableDevicesView}
			 * @private
			 */
			this._usableDevicesView = null;

			// init scope controller variables
			this._scope.appList = null;
			this._scope.ownDeviceView = null;
			this._scope.appConfigView = null;
			this._scope.usableDevicesView = null;

			var checkInitState = function(){
				if (self._applist && self._currentDeviceView &&
					self._appConfigView && self._usableDevicesView) {
					// dispatch loaded event upwards the scope hierarchy
					self._scope.$emit(Documa.ui.meta.MetaUIEvents.START_LOADED, self);
				}
			};

			// register listener for setting the main controller
			this._scope.$on(Documa.ui.meta.MetaUIEvents.CTRLINIT, function(evt, controller){
				self._mainController = controller;
				self._currentDeviceView.setMainController(self._mainController);
				self._applist.setMainController(self._mainController);
				self._appConfigView.setMainController(self._mainController);
				self._usableDevicesView.setMainController(self._mainController);
			});

			/////////////////////////////////////////////////////////
			// waiting for controller registration of each subview //
			/////////////////////////////////////////////////////////
			this._scope.$watch("appList", function(val){
				if (!val) return;
				self._applist = val;
				checkInitState.call(self);
			});
			this._scope.$watch("ownDeviceView", function(val){
				if (!val) return;
				self._currentDeviceView = val;
				checkInitState.call(self);
			});
			this._scope.$watch("appConfigView", function(val){
				if (!val) return;
				self._appConfigView = val;
				checkInitState.call(self);
			});
			this._scope.$watch("usableDevicesView", function(val){
				if (!val) return;
				self._usableDevicesView = val;
				checkInitState.call(self);
			});
		},
		/**
		 * @returns {Documa.ui.meta.subview.AppListView}
		 */
		getAppListView: function(){
			return this._applist;
		},

		/**
		 * @returns {Documa.ui.meta.subview.DevicePanelView}
		 */
		getCurrentDeviceView: function(){
			return this._currentDeviceView;
		},

		/**
		 * @returns {Documa.ui.meta.subview.AppConfigView}
		 */
		getAppConfigView: function(){
			return this._appConfigView;
		},

		/**
		 * @returns {Documa.ui.meta.subview.UsableDevicesView}
		 */
		getUsableDevicesView: function(){
			return this._usableDevicesView;
		}
	};
}());

/**
 * Definition of metaui tag.
 */
Documa.CSRM.directive("metauiStart", function($compile){
	return {
		restrict: "E",
		templateUrl: "lib/documa/ui/templates/mui_start.html",
		scope: {
			controller: "=" // reference to the controller's interface
		},
		/**
		 * @param {$rootScope.Scope} $scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		link: function($scope, elem, attr){
			var mui_startview = new Documa.ui.meta.subview.StartView($compile);
			mui_startview.setup($scope, elem, attr);
			$scope.$applyAsync(function(){
				$scope.controller = mui_startview;
			});
		}
	};
});