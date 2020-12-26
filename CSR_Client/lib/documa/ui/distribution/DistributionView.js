Ext.namespace("Documa.ui.distribution");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.DistributionModification");
Documa.require("Documa.distribution.migration.Migration");

Documa.ui.distribution.DistributionView = Ext.extend(Object, (function(){

	var TAG = "Documa.ui.distribution.DistributionView";
	var _log = Documa.util.Logger;

	var CLS_DISTITEM = "csr-distitem-panel";

	/**
	 * Helper method to get device representation from given component view panel.
	 *
	 * @param {Ext.DataView} componentsView view mapped to a specific device
	 * @return {Documa.distribution.Device} corresponding device representation from given view element
	 */
	function getDeviceFromComponentView(componentsView){
		for (var sid in this._deviceViewMap){
			var item = this._deviceViewMap[sid];
			if (item.componentsView === componentsView) {
				var deviceView = item.deviceView;
				var deviceRecord = deviceView.getStore().getAt(0);
				var sid = deviceRecord.id;
				return this._disman.getDevice(sid);
			}
		}
	}

	/**
	 * Creates a drag zone for given container element.
	 *
	 * @param {Mixed} container drag zone container element
	 */
	function initDragZone(container){
		var self = this;
		container.dragZone = new Ext.dd.DragZone(container.getEl(), {
			/**
			 * Is called after the user is dragging something.
			 *
			 * @param {Ext.EventObject} evt
			 */
			getDragData: function(evt){
				var sourceEl = evt.getTarget(container.itemSelector, 10);
				if (sourceEl) {
					var selectedNodes = container.getSelectedNodes();
					var ddContainer = document.createElement('div');
					//var clone = sourceEl.cloneNode(true);
					//clone.id = Ext.id();
					if (selectedNodes.length === 0) {
						selectedNodes.push(sourceEl);
					}

					// clone each selected element as drag proxy
					for (var i = 0; i < selectedNodes.length; ++i){
						var clone = selectedNodes[i].cloneNode(true);
						clone.id = Ext.id();
						clone.style.display = "inline-block";
						ddContainer.appendChild(clone);
					}

					return container.dragData = {
						sourceDevice: getDeviceFromComponentView.call(self, container),
						sourceView: container,
						sourceEl: sourceEl,
						repairXY: Ext.fly(sourceEl).getXY(),
						ddel: ddContainer,
						dataRecords: container.getSelectedRecords()
					};
				}
			},
			getRepairXY: function(){
				return this.dragData.repairXY;
			}
		});
	}

	/**
	 * Creates a dropzone for given container element.
	 *
	 * @param {Mixed} container drop zone container element
	 * @param {String} dropNodeClass css class of drop container
	 */
	function initDropZone(container, dropNodeClass){
		var self = this;
		container.dropZone = new Ext.dd.DropZone(container.getEl(), {
			/**
			 * Called after the mouse is over a target node, e. g. the components view of current distribution item panel.
			 * The returned "target" parameter is used as parameter in the following "onNode..." event handler functions.
			 *
			 * @param {Ext.EventObject}
			 */
			getTargetFromEvent: function(evt){
				return evt.getTarget(dropNodeClass);
			},
			/**
			 * Called when the draggable element has entered the specified target (drop node).
			 *
			 * @param {Object} target drop node returned from getTargetFromEvent
			 * @param {Ext.dd.DragSource} source draggable element
			 * @param {Event} evt the drag event
			 * @param {Object} data object containing arbitrary data supplied by the draggable source element
			 */
			onNodeEnter: function(target, source, evt, data){
				//_log.debug(TAG, "... draggable element entered drop node");
				if (data.sourceView !== container)
					Ext.fly(target).addClass('csr-distitem-cmps-over');
			},
			/**
			 * Called when the draggable element has left the specified target (drop node).
			 *
			 * @param {Object} target drop node returned from getTargetFromEvent
			 * @param {Ext.dd.DragSource} source draggable element
			 * @param {Event} evt the drag event
			 * @param {Object} data object containing arbitrary data supplied by the draggable source element
			 */
			onNodeOut: function(target, dd, evt, data){
				//_log.debug(TAG, "... draggable element left drop node");
				Ext.fly(target).removeClass('csr-distitem-cmps-over');
			},
			/**
			 * Called when the draggable element is over the specified target (drop node).
			 *
			 * @param {Object} target drop node returned from getTargetFromEvent
			 * @param {Ext.dd.DragSource} source draggable element
			 * @param {Event} evt the drag event
			 * @param {Object} data object containing arbitrary data supplied by the draggable source element
			 */
			onNodeOver: function(target, dd, evt, data){
				//_log.debug(TAG, "... draggable element is over drop node");
				if (data.sourceView !== container) {
					return Ext.dd.DropZone.prototype.dropAllowed;
				} else {
					return Ext.dd.DropZone.prototype.dropNotAllowed;
				}
			},
			/**
			 * Called when the draggable element has been dropped onto the specified target (drop node).
			 *
			 * @param {Object} target drop node returned from getTargetFromEvent
			 * @param {Ext.dd.DragSource} source draggable element
			 * @param {Event} evt the drag event
			 * @param {Object} data object containing arbitrary data supplied by the draggable source element
			 */
			onNodeDrop: function(target, dd, evt, data){
				//_log.debug(TAG, "... draggable element dropped!");
				if (data.sourceView === container) {
					// TODO: show warning that component migration to the same runtime device is not required
					_log.debug(TAG, "... migration from and to the same device makes no sense!");
					return false;
				}
				if (!data.dataRecords) {
					throw new Error("No data record entries defined!");
				}
				// get target device from data object
				var targetDevice = getDeviceFromComponentView.call(self, container);
				var sourceDevice = data.sourceDevice;
				if (!targetDevice)
					throw new Error("Could not determine device from drop target!");

				// get set of component items from drag data
				var components = [];
				for (var i = 0; i < data.dataRecords.length; ++i){
					// get component item data
					var c = data.dataRecords[i].data;
					// get component item from drag data
					var citem = self._disman.getComponentItem(c.id);
					components.push(citem);
				}

				if (components.length == 0) {
					throw new Error("Could not determine component items from drag data!");
				}

				// let the user decide if the migration process should start or not
				showStartMigrationConfirmation.call(self, targetDevice, components, function(){
					// user confirmed migration process
					for (var i = 0; i < components.length; ++i){
						// remove component item from source device
						self.removeComponent(sourceDevice.getSessionId(), components[i].getInstanceId());
						// add component item to target device
						self.addComponent(targetDevice.getSessionId(), components[i]);
					}

					// TODO: update component views to init drag'n'drop infrastructure

					// trigger migration process
					startComponentMigration.call(self, sourceDevice, targetDevice, components);
					// eof success callback
				}, function(){
					// user has cancelled migration process
					_log.debug(TAG, "... migration process canceled by the user!");
					return false;
					// eof cancel callback
				});
				return true;
			}
		});
	}

	/**
	 * Returns entity to present device on ui layer.
	 *
	 * @param {Documa.distribution.Device} device device representation on client-side
	 * @return {Object} object containing properties to present specified device instance
	 */
	function getPresentableDeviceItem(device){
		return {
			sid: device.getSessionId(),
			devname: device.getDeviceName(),
			devmod: device.getDeviceModelName(),
			csrversion: device.getRuntimeVersion(),
			csrname: device.getRuntimeName(),
			userid: device.getUserId(),
			devpic: device.getDevicePicture()
		};
	}

	/**
	 * Helper method to initiate drag'n'drop elements to select, drag and drop a single or multiple
	 * component representations between two visual distribution panels.
	 *
	 * @param {Ext.BoxComponent}
	 */
	function initDDElements(element){
		_log.debug(TAG, "... initiating drag'n'drop infrastructure!");
		initDragZone.call(this, element);
		initDropZone.call(this, element, '.csr-distitem-cmps');
	}

	/**
	 * Returns panel to present the specified distribution definition (consisting of a device and set of components).
	 *
	 * @param {Documa.distribution.Device}
	 */
	function createDistributionPanel(device, components){
		var dtpl = new Ext.XTemplate(
			'<tpl for=".">',
			'<div class="csr-device-wrap panel panel-success" id="{sid}">',
			'<div class="panel-heading">' +
			'<strong>Name:</strong> {devname}</div>',
			'<div class="csr-device panel-body">',
			'<p><strong>Model:</strong> {devmod}</p>',
			'<p><strong>Client Version:</strong> {csrversion}</p>',
			'<p><strong>Client Name:</strong> {csrname}</p>',
			'<p><strong>User Id:</strong> {userid}</p>',
			'<img src="{devpic}"/>',
			'</div>',
			'</div>',
			'</tpl>',
			'<div class="x-clear"/>');
		dtpl.compile();

		// creating device element
		var deviceView = new Ext.DataView({
			tpl: dtpl,
			store: new Ext.data.JsonStore({
				autoDestroy: true,
				idProperty: 'sid',
				fields: [{
					name: 'sid', // session id
					type: 'string'
				}, {
					name: 'devmod', // device model
					type: 'string'
				}, {
					name: 'devname', // device name
					type: 'string'
				}, {
					name: 'csrversion', // version of csr client
					type: 'string'
				}, {
					name: 'csrname', // name of csr client
					type: 'string'
				}, {
					name: 'userid', // user id
					type: 'string'
				}, {
					name: 'devpic', // url of device picture
					type: 'string'
				}]
			}),
			flex: 0.4,
			multiSelect: false,
			singleSelect: true,
			overClass: 'x-view-over',
			itemSelector: 'div.csr-device-wrap'
		});

		// load device item into device view
		deviceView.getStore().loadData(getPresentableDeviceItem(device));

		// creating component store
		var store = new Ext.data.JsonStore({
			autoDestroy: true,
			idProperty: 'id',
			fields: [{
				name: 'cid',
				type: 'string'
			}, {
				name: 'id',
				type: 'string'
			}, {
				name: 'caps',
				type: 'auto'
			}]
		});

		var ctpl = new Ext.XTemplate(
			'<ul>',
			'<tpl for=".">',
			'<li class="csr-cmp-wrap" id="{id}">',
			'<div class="panel panel-primary">',
			'<div class="panel-heading"><strong>Component: </strong>{id}</div>',
			'<div class="csr-cmp panel-body">',
			'<p>Name:{cid}</p>',
			'</div>',
			'</div>',
			'</li>',
			'</tpl>',
			'</ul>',
			'<div class="x-clear"/>');
		ctpl.compile();

		var self = this;
		var componentsView = new Ext.DataView({
			// binding store object to dataview
			store: store,
			autoScroll: true,
			// definition of dataview structure and data-binding
			tpl: ctpl,
			flex: 0.6,
			multiSelect: true,
			singleSelect: true,
			cls: 'csr-distitem-cmps',
			overClass: 'x-view-over',
			itemSelector: 'li.csr-cmp-wrap',
			listeners: {
				render: function(element){
					initDDElements.call(self, element);
				}
			}
		});

		// map view elements to devices session id
		this._deviceViewMap[device.getSessionId()] = {
			deviceView: deviceView,
			componentsView: componentsView
		};
		// check components set
		if (components != null && components != undefined && components.length > 0) {
			// fill up set of components
			for (var i = 0; i < components.length; ++i){
				var citem = components[i];
				store.loadData({
					id: citem.getInstanceId(),
					cid: citem.getComponentId(),
					caps: citem.getCapabilities()
				}, true);
			}
		}
		// create distribution panel
		return new Ext.Panel({
			title: 'Distribution Item',
			layout: {
				type: 'hbox',
				align: 'stretch'
			},
			cls: CLS_DISTITEM,
			height: 270,
			border: true,
			items: [deviceView, componentsView]
		});
	}

	/**
	 * Creates content panel showing devices and components list.
	 */
	function createPanel(){
		// creating panel that presents several component for each device
		return new Ext.Panel({
			layout: {
				type: 'vbox',
				align: 'stretch'
			},
			margins: {
				top: 5,
				right: 3,
				bottom: 5,
				left: 3
			},
			border: false
		});
	}

	/**
	 * Creates overlay dialog presenting devices and component mapping view.
	 *
	 * @param {Ext.Panel} contextPanel distribution dialog child panel
	 */
	function createDialog(contextPanel){
		return new Ext.Window({
			id: 'csr-dist-dialog',
			title: 'Distribution Configuration',
			layout: 'fit',
			width: "95%",
			autoScroll: true,
			height: 600,
			animCollapse: true,
			modal: true,
			showAnimDuration: 0.5,
			closeAction: 'hide',
			animateTarget: Documa.ui.UIElementIds.VIEWPORTID,
			cls: 'csr-dist-dialog',
			items: contextPanel
		});
	}

	/**
	 * Helper method to present the migration confirmation dialog.
	 */
	function showStartMigrationConfirmation(targetDevice, components, successCb, cancelCb){
		var self = this;
		var message = "Target device: " + targetDevice.getDeviceName() + " ";
		message += "Components: {";
		for (var i = 0; i < components.length; ++i){
			var instid = components[i].getInstanceId();
			message += instid;
			if (i < (components.length - 1)) {
				message += ", ";
			}
		}
		message += "}";

		Ext.MessageBox.show({
			animEl: Documa.ui.UIElementIds.VIEWPORTID,
			title: 'Confirm component migration!',
			msg: message,
			buttons: Ext.Msg.OKCANCEL,
			closable: false,
			icon: Ext.MessageBox.QUESTION,
			maxWidth: 400,
			minWidth: 100,
			modal: true,
			multiline: false,
			fn: function(btnId, text, opt){
				switch (btnId) {
					case "ok":
						// call success callback function
						successCb.call(self);
						break;
					case "cancel":
						// call cancel callback function
						cancelCb.call(self);

				}
			}
		});
	}

	/**
	 * Triggers the migration process with specified parameters.
	 *
	 * @param {Documa.distribution.Device} sourceDevice current runtime context of given component set
	 * @param {Documa.distribution.Device} targetDevice future runtime context of given component set
	 * @param {Array} components set of component instances included in the migration process {Documa.distribution.ComponentItem}
	 */
	function startComponentMigration(sourceDevice, targetDevice, components){
		_log.debug(TAG, "... triggering migration process with target device: " + targetDevice.getSessionId());
		// create migration object from given parameters
		// 1st: create a distribution modification
		var mid = window.uuid.v1();
		var modid = window.uuid.v1();
		var sid = Documa.RuntimeManager.getCommunicationManager().getClientID();
		var appcontext = Documa.RuntimeManager.getApplicationContext();
		var distmod = new Documa.distribution.DistributionModification(modid, Documa.distribution.DistributionModificationTypes.ADD, components, targetDevice.getSessionId());
		// 2nd: creates an migration instance
		var migration = new Documa.distribution.migration.Migration(mid, sourceDevice.getSessionId(), sid, appcontext);
		migration.addModification(distmod);
		// 3rd: trigger server-coordinated migration transaction
		this._disman.triggerMigration(migration);
		// ****************************************************************
	}

	/**
	 * Includes the cancellation of a migration process.
	 *
	 * @param {Documa.distribution.Device} targetDevice runtime context of migration
	 * @param {Array} components set of migrating components
	 */
	function cancelComponentMigration(targetDevice, components){
		_log.debug(TAG, "... cancel migration process with target device: " + targetDevice.getSessionId());
		throw new Error("Not implemented yet!");
	}

	return {
		/**
		 * Constructor is called only from the distribution manager.
		 *
		 * @param {Documa.distribution.DistributionManager} distributionManager
		 */
		constructor: function(distributionManager){
			Documa.ui.distribution.DistributionView.superclass.constructor.call(this);

			// distribution manager reference
			this._disman = distributionManager;

			// holds reference to panel presenting several component sets (each device has a specific set of components)
			this._contentPanel = createPanel.call(this);

			// map containing as set of components for each device specified by its session id
			this._deviceViewMap = {};

			// init distribution dialog
			this._distributionDialog = createDialog.call(this, this._contentPanel);
		},
		/**
		 * Encapsulates the logic to visualize the distribution specified by the given device and component set.
		 *
		 * @param {Documa.distribution.Device} device runtime context currently executing specified component set
		 * @param {Array} components set of components (each component is represented as Documa.distribution.ComponentItem) executed by given device
		 */
		showDistribution: function(device, components){
			// TODO: get device element and append all components to this device item
			var sid = device.getSessionId();
			var entry = this._deviceViewMap[sid];
			if (!entry) {
				// it is a new device
				throw new Error("Not implemented yet!");
			} else {
				// device is known --> just update the corresponding component store
				var store = entry.componentsView.getStore();
				if (!store)
					throw new Error("No components store defined for device: " + sid);

				// update components store
				store.removeAll();
				// delete old component entries
				for (var i = 0; i < components.length; ++i){
					// add component item as Documa.distribution.ComponentItem
					this.addComponent(sid, components[i]);
				}
			}

		},
		/**
		 * Adds component representation object into distribution view.
		 *
		 * @param {String} sid session id of device
		 * @param {Documa.distribution.ComponentItem} component object representing a component within the
		 * distribution dialog
		 */
		addComponent: function(sid, component){
			// check if there is a corresponding component store
			if (!this._deviceViewMap[sid])
				throw new Error("Can not add components to undefined device!");

			// getting device specific component view
			var cview = this._deviceViewMap[sid].componentsView;

			//append component object to device specific component store item
			cview.getStore().loadData({
				id: component.getInstanceId(),
				cid: component.getComponentId(),
				caps: component.getCapabilities()
			}, true);

			//cview.fireEvent("render", cview);
			this._contentPanel.doLayout();
		},
		/**
		 * Remove component representation object from distribution view.
		 */
		removeComponent: function(sid, instid){
			// check if there is a corresponding component store
			if (!this._deviceViewMap[sid])
				throw new Error("Can not remove components from undefined device!");

			// getting device specific component view
			var cview = this._deviceViewMap[sid].componentsView;
			var store = cview.getStore();
			store.remove(store.getById(instid));

			//cview.fireEvent("render", cview);
			this._contentPanel.doLayout();
		},
		/**
		 * Called when the specified device should be represented as the currently
		 * used/owned device.
		 *
		 * @param {Documa.distribution.Device} device currently used/owned device
		 */
		addOwnedDevice: function(device){
			// creating a panel presenting device specific set of components
			var distpanel = createDistributionPanel.call(this, device, null);
			this._contentPanel.add(distpanel);
			//this._contentPanel.doLayout();
			this._distributionDialog.doLayout();
		},
		/**
		 * Adds device descriptor entry to this view element.
		 * @param {Documa.distribution.Device} device descriptor entry
		 */
		addDevice: function(device){
			//create a distribution panel with an empty set of components
			var distpanel = createDistributionPanel.call(this, device, null);
			this._contentPanel.add(distpanel);
			//this._contentPanel.doLayout();
			this._distributionDialog.doLayout();
		},
		/**
		 * Removes device entry from device list.
		 * @param {Documa.distribution.Device} device descriptor entry
		 */
		removeDevice: function(device){
			// TODO: implement here --> remove entry with id of specified object from device
			// store
			throw new Error("Not implemented yet!");
		},
		/**
		 * Presenting dynamic distribution view.
		 */
		show: function(){
			this._distributionDialog.show(Documa.ui.UIElementIds.VIEWPORTID);
		},
		/**
		 * Hiding dynamic distribution view.
		 */
		hide: function(){
			this._distributionDialog.hide();
		},
		/**
		 * Closing dynamic distribution view.
		 */
		close: function(){
			this._distributionDialog.close();
		}
	};
})());
