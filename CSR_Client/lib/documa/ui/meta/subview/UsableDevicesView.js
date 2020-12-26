Ext.namespace("Documa.ui.meta.subview");

/**
 * Present usable devices in the metaui's startview.
 * @class
 */
Documa.ui.meta.subview.UsableDevicesView = Ext.extend(Object, function() {
	const TAG = "Documa.ui.meta.subview.UsableDevicesView";
	const _log = Documa.util.Logger;
	const _util = Documa.util.Util;
	const jq = jQuery;
	/////////////////////
	// private methods //
	/////////////////////
	
	/**
	 * Called after a device item was dragged.
	 * @param {DragEvent} event
	 * @param {Documa.distribution.Device} device
	 */
	function dragDevice(event, device) {
		// setting session id for data transfer
		event.dataTransfer.setData(Documa.ui.meta.DnD.TEXT, device.getSessionId());
	}
	
	/* TODO: add here your private methods */
	
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {$compile} compile
		 */
		constructor: function(compile) {
			Documa.ui.meta.subview.UsableDevicesView.superclass.constructor.call(this);
			this._compile = compile;
			/**
			 * @type {Documa.ui.meta.MetaUIController}
			 * @private
			 */
			this._mainController = null;
		},
		
		/**
		 * Init devices view.
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		setup: function(scope, elem, attr) {
			let self = this;
			
			/**
			 * @type {$rootScope.Scope}
			 * @private
			 */
			this._scope = scope;
			
			/**
			 * @type {jQuery}
			 * @private
			 */
			this._elem = elem;
			
			/**
			 * @type {Object}
			 * @private
			 */
			this._attr = attr;
			
			/**
			 * @type {Array.<Documa.distribution.Device>}
			 * @private
			 */
			this._scope.devices = [];
			
			// init tooltips
			elem.find(".csr-mui-udevices-list > a[data-toggle='tooltip']").tooltip();
			
			// register event handler at current scope object
			this._scope.onDeviceDrag = dragDevice.bind(this);
		},
		
		/**
		 * Sets metaui's main controller.
		 * @param {Documa.ui.meta.MetaUIController} controller
		 */
		setMainController: function(controller) {
			this._mainController = controller;
		},
		
		/**
		 * Adds device into the list of usable devices.
		 * @param {Documa.distribution.Device} device
		 */
		addDevice: function(device) {
			let self = this;
			if(this._scope.devices.find(d => d.getSessionId() === device.getSessionId()))
				return; // device already included
			
			self._scope.$applyAsync(function() {
				self._scope.devices.push(device);
			});
		},
		
		/**
		 * Removes specified device from list of usable devices.
		 * @param {Documa.distribution.Device} device
		 */
		removeDevice: function(device) {
			let self = this;
			let del = -1;
			for(let i = 0; i < this._scope.devices.length; ++i) {
				if(this._scope.devices[i].getSessionId() === device.getSessionId()) {
					del = i;
					break;
				}
			}
			if(del < 0)
				throw new Error("Could not remove device with session id: " + device.getSessionId());
			
			this._scope.$apply(function() {
				_util.remove(del, self._scope.devices);
			});
		},
		
		/**
		 * Removes all devices from list of usable devices.
		 */
		clear: function() {
			let self = this;
			this._scope.$applyAsync(function() {
				self._scope.devices = [];
			});
		}
	};
}());

/**
 * Defining the usable devices view directive.
 */
Documa.CSRM.directive("muiDevicesView", function($compile) {
	return {
		restrict: "E",
		templateUrl: "lib/documa/ui/templates/mui_visibledevices.html",
		scope: {
			// add element attributes
			controller: "="
		},
		link: function($scope, element, attr) {
			let controller = new Documa.ui.meta.subview.UsableDevicesView($compile);
			controller.setup($scope, element, attr);
			$scope.$applyAsync(function() {
				// setting app config controller and notifying watching parents
				$scope.controller = controller;
			});
		}
	};
});