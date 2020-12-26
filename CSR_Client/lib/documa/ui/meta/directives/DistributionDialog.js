Ext.namespace("Documa.ui.meta.directives");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");
Documa.require("Documa.ui.mainmenu.SearchResultView");
Documa.require("Documa.ui.mainmenu.Utils");
Documa.require("Documa.distribution.ComponentItem");
Documa.require("Documa.ui.meta.directives.DistributionItem");
Documa.require("Documa.distribution.DistributionModification");

/**
 * @class
 * @implements {Documa.ui.mainmenu.SearchResultView}
 */
Documa.ui.meta.directives.DistributionDialog = Ext.extend(Documa.ui.mainmenu.SearchResultView, function(){
	var TAG = "Documa.ui.meta.directives.DistributionDialog";
	var _log = Documa.util.Logger;
	var _util = Documa.util.Util;

	/**
	 * Called on the drag event of a device item.
	 * @param {DragEvent} event
	 * @param {Documa.distribution.Device} device
	 */
	function onDeviceDrag(event, device){
		// set device's session id to the drag event
		event.dataTransfer.setData(Documa.ui.meta.DnD.TEXT, device.getSessionId());
	}

	/**
	 * Called on the drag event of a component item.
	 * @param {DragEvent} event
	 * @param {Documa.distribution.ComponentItem} component
	 */
	function onComponentDrag(event, component){
		// set component's id to the drag event
		event.dataTransfer.setData(Documa.ui.meta.DnD.TEXT, component.getComponentId());
	}


	/**
	 * Returns the corresponding visual representation of the specified distribution object.
	 * @param {Documa.distribution.DistributionModification} modification
	 */
	function getVisualDistributionItem(modification){
		for (var i = 0; i < this._distributionItems.length; ++i){
			var distItem = this._distributionItems[i];
			if (distItem.getModification() === modification) {
				return distItem;
			}
		}
		return null;
	}

	/**
	 * Called after an data item was dropped onto the distribution list.
	 * @param {DragEvent} event
	 */
	function onDistributionListDropped(event){
		var self = this;
		var id = event.dataTransfer.getData(Documa.ui.meta.DnD.TEXT);
		var device = getDevice.call(this, id);
		var host = Documa.RuntimeManager.getRuntimeContext().getDevice();
		var distman = this._applicationContext.getDistributionManager();
		/** @type {Documa.distribution.Distribution} */
		var distribution = null;
		var modification = null;
		if (device) { // dropped element was a device
			// create a distribution instance from given target device
			distribution = distman.addDevice(device, (host === device));
			// test if there is a modification adressing the dropped device
			var mods = distman.getPreparingModifications().filter(function(mod){
				return mod.getTarget() === device.getSessionId();
			});
			if (mods.length < 1) {
				// create descriptor of distribution state modification
				modification = new Documa.distribution.DistributionModification(uuid.v1(),
					Documa.distribution.DistributionModificationTypes.CREATE, [], device.getSessionId());
				_log.debug(TAG, "... adding new realization modification!");
				distman.getPreparingModifications().push(modification);
			} else {
				modification = mods[0];
			}
		} else { // dropped element was a component
			var component = getComponent.call(this, id);
			if (!component)
				throw new Error("No valid item dropped on distribution panel!");
			// get a distribution instance from component item using the current host device
			distribution = distman.addDevice(host, true);
			// test if there is already a distribution state modification addressing the
			// hist device
			var mods = distman.getPreparingModifications().filter(function(mod){
				return mod.getTarget() === host.getSessionId();
			});

			if (mods.length < 1) {
				// create descriptor of distribution state modification
				modification = new Documa.distribution.DistributionModification(uuid.v1(),
					Documa.distribution.DistributionModificationTypes.CREATE, [], host.getSessionId());
				_log.debug(TAG, "... adding new realization modification!");
				distman.getPreparingModifications().push(modification);
			} else {
				modification = mods[0];
			}
			// create new modification instance describing the distribution state modification
			if (distribution.containsComponent(component.getInstanceId(), component.getComponentId())) {
				modification.getComponents().push(component.copy());
			} else {
				modification.getComponents().push(component);
			}

		}
		if (!modification)
			throw new Error("Invalid modification!");

		// test whether current distribution object is already defined
		if (this._scope.modifications.indexOf(modification) >= 0) {
			// current distribution was already registered
			if (device) {
				// adding another device to an existing distribution object
				// is currently not supported
				return;
			} else if (component) {
				// get visual distribution representation and refresh it
				var distItem = getVisualDistributionItem.call(this, modification);
				if (!distItem)
					throw new Error("Could not get a visual distribution item from current distribution object.");
				distItem.refresh();
			} else {
				throw new Error("Invalid object selected!");
			}
		} else {
			// add the distribution to the scope's distribution collection
			this.addModification(modification);
		}
	}

	/**
	 * @param {string} cid
	 * @returns {Documa.distribution.ComponentItem}
	 */
	function getComponent(cid){
		for (var i = 0; i < this._currentComponents.length; ++i){
			var citem = this._currentComponents[i];
			if (citem.getComponentId() === cid) {
				return citem;
			}
		}
		return null;
	}

	/**
	 * @param {string} sid
	 * @returns {Documa.distribution.Device}
	 */
	function getDevice(sid){
		for (var i = 0; i < this._scope.devices.length; ++i){
			var device = this._scope.devices[i];
			if (device.getSessionId() === sid) {
				return device;
			}
		}
		return null;
	}

	/**
	 * Commit the distributed component integration.
	 *
	 * @param {jQuery.Event} event
	 */
	function commitIntegration(event){
		var self = this;
		// trigger realize each distribution
		this._mainController.getState().realizeDistribution().then(function(result){
			// successfully realized the application's distribution state
			self._mainController.getMetaUIView().showLoader("... completed!");
			// remove all distribution state modifications defined at the beginning
			_util.clearArray(self._applicationContext.getDistributionManager().getPreparingModifications());
			setTimeout(function(){
				self._mainController.getMetaUIView().hideLoader();
			}, 700);
		}).catch(function(error){
			_log.error(TAG, error.stack);
			_util.clearArray(self._applicationContext.getDistributionManager().getPreparingModifications());
		});
		setTimeout(function(){
			self.hide();
			self.clearModifications();
			self._mainController.getMetaUIView().showLoader("Integrating components ...");
		}, 300);
	}

	/**
	 * Cancel the distributed component integration.
	 *
	 * @param {jQuery.Event} event
	 */
	function cancelIntegration(event){
		var self = this;
		var copy = _util.copyArray(this._distributionItems);
		// destroy each distribution item currently presented in the distribution dialog
		copy.forEach(function(item){
			destroyDistribution.call(self, item);
		});
		this.clearModifications();
		// close the distribution dialog
		setTimeout(function(){
			self.hide();
		}, 200);
	}

	/**
	 *
	 * @param {Documa.ui.meta.directives.DistributionItem} distitem
	 */
	function destroyDistribution(distitem){
		// remove distribution from application context
		this._applicationContext.getDistributionManager().removeDevice(distitem.getModification().getTarget());
		distitem.clearComponents();
		// remove given distribution item from internal register
		_util.removeElement(distitem, this._distributionItems);
		// remove corresponding distribution from ui layer
		this.removeModification(distitem.getModification());
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
		constructor: function(compile){
			Documa.ui.meta.directives.DistributionDialog.superclass.constructor.call(this);
			this._super = Documa.ui.meta.directives.DistributionDialog.superclass;
			this._compile = compile;
			this._scope = null;
			this._elem = null;
			this._resultReader = Documa.ui.mainmenu.Utils.getSPARQLResultJSONReader();

			/**
			 * @type {Documa.ui.meta.MetaUIController}
			 * @private
			 */
			this._mainController = null;

			/**
			 * @type {Array.<Documa.distribution.ComponentItem>}
			 * @private
			 */
			this._currentComponents = null;

			/**
			 * Keeps reference to current application context.
			 * @type {Documa.context.ApplicationContext}
			 * @private
			 */
			this._applicationContext = null;

			/**
			 * @type {Array.<Documa.ui.meta.directives.DistributionItem>}
			 * @private
			 */
			this._distributionItems = [];

			/**
			 * @type {{id:number, query:string}}
			 * @private
			 */
			this._searchTask = null;
		},

		/**
		 * Initiate dialog.
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		setup: function(scope, elem, attr){
			this._scope = scope;
			this._elem = elem;
			var self = this;

			/** @type {jQuery} */
			this._modal = this._elem.find("#csr-mui-cmpdist");

			/**
			 * @type {Array.<Documa.distribution.Device>}
			 */
			this._scope.devices = [];

			/**
			 * @type {Array.<Documa.distribution.ComponentItem>}
			 */
			this._scope.components = [];

			/**
			 * @type {Array.<Documa.distribution.Distribution>}
			 */
			this._scope.distributions = [];

			/**
			 * @type {Array.<Documa.distribution.DistributionModification>}
			 */
			this._scope.modifications = [];

			/**
			 * @type {Documa.distribution.Distribution}
			 */
			this._scope.currentDistribution = null;

			/**
			 * @type {string}
			 */
			this._scope.searchQuery = null;

			// listen to the controller initiated event
			this._scope.$on(Documa.ui.meta.MetaUIEvents.CTRLINIT, function(evt, controller){
				self._mainController = controller;
			});

			// add host device to device selection list
			//var host = Documa.RuntimeManager.getRuntimeContext().getDevice();
			//this.addDevice(host);

			// bind private event handler to scope-based event handler
			this._scope.onComponentDrag = onComponentDrag.bind(this);
			this._scope.onDeviceDrag = onDeviceDrag.bind(this);
			this._scope.onDistributionDropped = onDistributionListDropped.bind(this);
			this._scope.onCommitIntegration = commitIntegration.bind(this);
			this._scope.onCancelIntegration = cancelIntegration.bind(this);
			this._scope.$on(Documa.ui.meta.MetaUIEvents.DISTITEM_CREATED,
				/**
				 * @param {jQuery.Event} event
				 * @param {Documa.ui.meta.directives.DistributionItem} controller
				 */
				function(event, controller){
					if (controller instanceof Documa.ui.meta.directives.DistributionItem) {
						self._distributionItems.push(controller);
						controller.setParentDialog(self);
					}
				});

			this._scope.$on(Documa.ui.meta.MetaUIEvents.DISTITEM_CLOSED,
				/**
				 * @param {jQuery.Event} event
				 * @param {Documa.ui.meta.directives.DistributionItem} controller
				 */
				function(event, controller){
					destroyDistribution.call(self, controller);
					_log.debug(TAG, "Distribution item destroyed!");
				});

			// listen for query changes
			this._scope.$watch("searchQuery", function(newValue){
				//_log.debug(TAG, "Search query changed: " + newValue);
				if (!newValue) return;
				if (!self._searchTask) {
					var id = setTimeout(function(){
						var menuManager = Documa.RuntimeManager.getUIManager().getMenuManager();
						menuManager.doSearch(self._searchTask.query, true, 30);
						self._searchTask = null;
					}, 800);
					self._searchTask = {id: id, query: newValue};
				} else {
					self._searchTask.query = newValue;
				}
			});
		},

		/**
		 * Adds component to the distribution dialog.
		 * @param {Documa.distribution.ComponentItem} component
		 */
		addComponent: function(component){
			var self = this;
			this._scope.$applyAsync(function(){
				self._scope.components.push(component);
			});
		},

		/**
		 * Removes all distributable components.
		 */
		clearComponents: function(){
			var self = this;
			this._scope.$applyAsync(function(){
				self._scope.components = [];
			});
		},

		/**
		 * Adds visible device to the distribution dialog.
		 *
		 * @param {Documa.distribution.Device} device
		 */
		addDevice: function(device){
			var self = this;
			this._scope.$applyAsync(function(){
				self._scope.devices.push(device);
			});
		},


		/**
		 * Tests whether the given device was already added to the distribution dialog.
		 * @param {Documa.distribution.Device} device
		 */
		containsDevice: function(device){
			return this._scope.devices.some(function(d){
				return (device.getSessionId() === d.getSessionId());
			});
		},

		/**
		 * Removes visible device from distribution dialog.
		 * @param {Documa.distribution.Device} device
		 */
		removeDevice: function(device){
			var self = this;
			this._scope.$applyAsync(function(){
				_util.removeElement(device, self._scope.devices);
			});
		},

		/**
		 * Removes all visible devices from this distribution dialog.
		 */
		clearDevices: function(){
			var self = this;
			this._scope.$applyAsync(function(){
				self._scope.devices = [];
			});
		},

		/**
		 * Adds a distribution modification to the scope's modification collection.
		 * @param {Documa.distribution.DistributionModification} modification
		 */
		addModification: function(modification){
			var self = this;
			this._scope.$applyAsync(function(){
				self._scope.modifications.push(modification);
			});
		},

		/**
		 * @param {Documa.distribution.DistributionModification} modification
		 */
		removeModification: function(modification){
			var self = this;
			var dindex = this._scope.modifications.indexOf(modification);
			if (dindex < 0)
				throw new Error("Could not remove modification instance!");
			this._scope.$applyAsync(function(){
				_util.remove(dindex, self._scope.modifications);
			});
		},

		/**
		 * Clears collection of visible distributions.
		 */
		clearModifications: function(){
			var self = this;
			this._scope.$applyAsync(function(){
				self._scope.modifications = [];
			});
		},

		/**
		 * Renders component distribution dialog.
		 */
		show: function(){
			this._super.show();
			this._modal.modal("show");
		},

		/**
		 * Hides component distribution dialog.
		 */
		hide: function(){
			this._super.hide();
			this._modal.modal("hide");
		},

		/**
		 * Updates current layout.
		 */
		refresh: function(){
			var self = this;
			this.clearComponents();
			if (this._currentComponents && this._currentComponents.length > 0) {
				this._currentComponents.forEach(function(citem){
					self.addComponent(citem);
				});
			}
		},

		/**
		 * Loads component search results.
		 *
		 * @param {ComponentSearchResult} response
		 */
		loadResults: function(response){
			_log.debug(TAG, "Received search component results: " + response);
			var searchResponse = this._resultReader.read(response.results);
			var self = this;
			this._currentComponents = [];
			// create component items from search response
			searchResponse.forEach(function(responseObject){
				var citem = new Documa.distribution.ComponentItem({id: uuid.v1(), cid: responseObject.id});
				citem.setName(responseObject.name);
				citem.setIcon(responseObject.icon);
				citem.setDescription(responseObject.text);
				self._currentComponents.push(citem);
			});
		},

		/**
		 * Sets current application context.
		 * @param {Documa.context.ApplicationContext} appctxt
		 */
		setApplicationContext: function(appctxt){
			this._applicationContext = appctxt;
		},

		/**
		 * @returns {Array.<Documa.distribution.ComponentItem>}
		 */
		getAvailableComponents: function(){
			return this._currentComponents;
		}
	};
}());


/**
 * Definition of component distribution dialog.
 */
Documa.CSRM.directive("muiComponents", function($compile){
	return {
		restrict: "E",
		templateUrl: "lib/documa/ui/templates/mui_distributiondialog.html",
		scope: {
			controller: "="
		},
		/**
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		link: function(scope, elem, attr){
			var dialog = new Documa.ui.meta.directives.DistributionDialog($compile);
			dialog.setup(scope, elem, attr);
			// notify parent scope
			scope.$applyAsync(function(){
				scope.controller = dialog;
			});
		}
	};
});
