Ext.namespace("Documa.ui.meta.directives");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");
Documa.require("Documa.ui.meta.directives.IconItem");
Documa.require("Documa.ui.meta.directives.DragNDrop");

/**
 * @class
 */
Documa.ui.meta.directives.DistributionItem = Ext.extend(Object, function(){
	var TAG = "Documa.ui.meta.directives.DistributionItem";
	var _log = Documa.util.Logger;
	var _util = Documa.util.Util;
	/////////////////////
	// private methods //
	/////////////////////

	/**
	 * Fires distribution close event to its parent scope.
	 */
	function fireClose(){
		this._scope.$emit(Documa.ui.meta.MetaUIEvents.DISTITEM_CLOSED, this);
	}

	/**
	 * Called after a component were dropped onto a distribution item.
	 * @param {DragEvent} event
	 * @param {Documa.distribution.ComponentItem} component
	 */
	function onDropped(event){
		event.preventDefault();
		event.stopPropagation();
		var cid = event.dataTransfer.getData(Documa.ui.meta.DnD.TEXT);
		/** @type {Array.<Documa.distribution.ComponentItem>} */
		var cmps = this._parentDialog.getAvailableComponents().filter(function(citem){
			return citem.getComponentId() === cid;
		});

		if (cmps.length == 0)
			throw new Error("Could not find any matching component!");
		// create a new component instance.
		var copy = cmps[0].copy();
		this.addComponent(copy);
	}

	/**
	 * Removes component item.
	 * @param {Documa.ui.meta.directives.IconItem} cmpItem
	 */
	function removeComponentItem(cmpItem){
		// remove an item from this distribution
		var match = this._scope.components.filter(function(citem){
			return citem.getInstanceId() === cmpItem.getId();
		});
		if (match.length == 0)
			return; // there is no matching component
		else if (match.length > 1)
			throw new Error("Only a single component instance with a specific id is allowed!");
		// got matching component instance ==> remove it
		this.removeComponent(match[0]);
	}

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {$compile} compile
		 * @param {Documa.distribution.DistributionModification} modification
		 */
		constructor: function($compile, modification){
			this._compile = $compile;
			this._modification = modification;
			/**
			 * @type {Documa.ui.meta.directives.DistributionDialog}
			 * @private
			 */
			this._parentDialog = null;
		},
		/**
		 *
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		setup: function(scope, elem, attr){
			this._scope = scope;
			this._elem = elem;
			this._attr = attr;

			/**
			 * component collection represented on ui layer.
			 * @type {Array.<Documa.distribution.ComponentItem>}
			 */
			this._scope.components = [];

			// initiate this visual representation of current distribution
			var self = this;
			this._modification.getComponents().forEach(function(component){
				self.addComponent(component);
			});

			// init distribution target device
			this.setDevice(Documa.RuntimeManager.getEnvironmentContext().getDevice(this._modification.getTarget()));

			// register component dropped event handler
			this._scope.onComponentDropped = onDropped.bind(this);
			this._scope.close = fireClose.bind(this);

			// listen for close event
			this._scope.$on(Documa.ui.meta.MetaUIEvents.ITEM_CLOSED,
				/** @param {jQuery.Event} event
				 *  @param {Documa.ui.meta.directives.IconItem} controller */
				function(event, controller){
					if (controller instanceof Documa.ui.meta.directives.IconItem) {
						removeComponentItem.call(self, controller);
					}
				});
		},

		/**
		 * @returns {Documa.distribution.DistributionModification}
		 */
		getModification: function(){
			return this._modification;
		},

		/**
		 * Adds component to this distribution item.
		 * @param {Documa.distribution.ComponentItem} component
		 */
		addComponent: function(component){
			var self = this;
			this._scope.$applyAsync(function(){
				self._scope.components.push(component);
			});
			if (!this._modification.containsComponent(component.getInstanceId(), component.getComponentId())) {
				this._modification.getComponents().push(component);
			}
		},

		/**
		 * Removes given component from ui layer.
		 * @param {Documa.distribution.ComponentItem} component
		 */
		removeComponent: function(component){
			var self = this;
			var dindex = this._scope.components.indexOf(component);
			if (dindex < 0)
				throw new Error("Could not remove component!");

			this._scope.$applyAsync(function(){
				_util.remove(dindex, self._scope.components);
			});
			if (this._modification.containsComponent(component.getInstanceId(), component.getComponentId())) {
				_util.removeElement(component, this._modification.getComponents());
			}
		},

		/**
		 * Clears component collection.
		 */
		clearComponents: function(){
			var self = this;
			this._scope.components.forEach(function(cmp){
				self.removeComponent(cmp);
			});
		},

		/**
		 * Sets given device as distribution target container.
		 *
		 * @param {Documa.distribution.Device} device
		 */
		setDevice: function(device){
			var self = this;
			this._scope.$applyAsync(function(){
				self._scope.device = device;
			});
		},

		/**
		 * Synchronize distribution data item with its visual representation.
		 */
		refresh: function(){
			var self = this;
			this._modification.getComponents().forEach(function(citem){
				if (self._scope.components.indexOf(citem) < 0) {
					// current component has to be added to the ui layer
					self.addComponent(citem);
				}
			});
			/** @type {Array.<Documa.distribution.ComponentItem>} */
			var removables = [];
			this._scope.components.forEach(function(citem){
				if (self._modification.getComponents().indexOf(citem) < 0) {
					// current component should be removed from the ui layer
					removables.push(citem);
				}
			});

			// remove components that are not any longer referenced in the distribution instance
			removables.forEach(function(citem){
				self.removeComponent(citem);
			});

			// update distribution target runtime container
			var distributionTarget = Documa.RuntimeManager.getEnvironmentContext().getDevice(this._modification.getTarget());
			this.setDevice(distributionTarget);
		},

		/**
		 * Returns integration job description.
		 * @returns {Object}
		 */
		getIntegration: function(){
			throw new Error("Not implemented yet!");
		},

		/**
		 * Sets parent distribution dialog.
		 * @param {Documa.ui.meta.directives.DistributionDialog} parent
		 */
		setParentDialog: function(parent){
			this._parentDialog = parent;
		},

		/**
		 * Commit current distribution item.
		 */
		commit: function(){
			var self = this;
			this._scope.components.forEach(function(citem){
				self._modification.getComponents().push(citem);
			});
			// TODO: call the applications distribution manager
			// and trigger the realization of given distribution
			throw new Error("Not ready yet!");
		}
	};
}());

/**
 * Distribution item directive
 */
Documa.CSRM.directive("muiDistribution", function($compile){
	return {
		restrict: "E",
		scope: {
			controller: "=",
			modification: "="
		},
		templateUrl: "lib/documa/ui/templates/mui_distribution.html",
		link: function(scope, elem, attr){
			var mui_ditem = new Documa.ui.meta.directives.DistributionItem($compile, scope.modification);
			mui_ditem.setup(scope, elem, attr);
			scope.$emit(Documa.ui.meta.MetaUIEvents.DISTITEM_CREATED, mui_ditem);
		}
	};
});