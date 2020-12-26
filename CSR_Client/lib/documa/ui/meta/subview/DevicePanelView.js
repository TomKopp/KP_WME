Ext.namespace("Documa.ui.device");

Documa.require('Documa.util.Logger');
Documa.require('Documa.RuntimeManager');

/**
 * Class presenting current device details as well as its collection of device features.
 */
Documa.ui.meta.subview.DevicePanelView = Ext.extend(Object, function(){
	var TAG = 'Documa.ui.device.DevicePanelView';
	var _log = Documa.util.Logger;
	var BLOCK_ID = 'csr-ui-meta-device-deviceview';

	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {$compile} compile
		 */
		constructor: function(compile){
			var self = this;
			this._compile = compile;
			this._scope = null;
			this._elem = null;

			/**
			 * @type {Documa.context.RuntimeContext}
			 * @private
			 */
			this._runtime = Documa.RuntimeManager.getRuntimeContext();

			/**
			 * @type {Documa.ui.meta.MetaUIController}
			 * @private
			 */
			this._mainController = null;
		},

		/**
		 * UI directive is initialized.
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		setup: function(scope, elem, attr){
			this._scope = scope;
			this._elem = elem;
			var self = this;

			// setup a device object containing all relevant information of current device
			scope.device = this._runtime.getDevice();
		},

		/**
		 * Sets metaui's main controller.
		 * @param {Documa.ui.meta.MetaUIController} controller
		 */
		setMainController: function(controller){
			this._mainController = controller;
		}
	};
}());

/**
 * Definition of current device panel directive.
 */
Documa.CSRM.directive("muiOwnDevicePanel", function($compile){
	return {
		restrict: "E",
		templateUrl: "lib/documa/ui/templates/mui_owndevice.html",
		scope: {
			controller: "="
		},
		link: function($scope, elem, attr){
			// creating controller instance
			var dev_panel = new Documa.ui.meta.subview.DevicePanelView($compile);
			dev_panel.setup($scope, elem, attr);
			$scope.$applyAsync(function(){
				// bind controller instance to the scope attribute --> interface for the encapsulating controller
				$scope.controller = dev_panel;
			});
		}
	};
});