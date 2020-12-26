Ext.namespace("Documa.ui.distribution");

Documa.require("Documa.util.Logger");

Documa.ui.distribution.ChoiceDistributionView = Ext.extend(Object, (function () {

	var TAG = "Documa.ui.distribution.ChoiceDistributionView";
	var _log = Documa.util.Logger;

	var DIST_CONTAINER_ID = "csr-dist-container";

	/**
	 * Helper method to create distribution target selection window.
	 *
	 * @return {Ext.Window}
	 */
	function createDistributionContainer() {
		return new Ext.TabPanel({
			id: DIST_CONTAINER_ID,
			title: "Distribution Choice",
			autoScroll: true,
			activeTab: 0,
			bufferResize: true
		});
	};

	/**
	 * Returns a panel object containing every component being part of a
	 * distribution object.
	 *
	 * @param {Array}
	 *            cmpItems array of component description items; each is
	 *            containing the name and component-id (cid)
	 * @return {Ext.Panel}
	 */
	function createComponentPanel(cmpItems) {
		_log.debug(TAG, "... creating new component panel");

		// creating store object providing all component items to the dataview
		// object
		var store = new Ext.data.JsonStore({
			autoDestroy: true,
			idProperty: 'instid',
			fields: [
				{
					name: 'name',
					type: 'string'
				},
				{
					name: 'cid',
					type: 'string'
				},
				{
					name: 'instid',
					type: 'string'
				}
			]
		});

		// loading component descriptors manually
		store.loadData(cmpItems);

		// defining item structure
		var tpl = new Ext.XTemplate(
			'<tpl for=".">',
			'<div class="thumb-wrap" id="{instid}">',
			'<div class="thumb">',
			'<p>Name:</p>',
			'<p>{name}</p>',
			'<p>Id: {instid}</p>',
			'</div>',
			'</div>',
			'</tpl>',
			'<div class="x-clear"/>');

		// definition of component dataview
		var cmpDataView = new Ext.DataView({
			// binding store object to dataview
			store: store,
			// definition of dataview structure and data-binding
			tpl: tpl,
			multiSelect: false,
			singleSelect: false,
			overClass: 'x-view-over',
			itemSelector: 'div.thumb-wrap'
		});

		return new Ext.Panel({
			id: 'dist-cmp-panel',
			title: 'Components',
			margins: '5',
			flex: 0,
			layout: 'fit',
			items: cmpDataView
		});
	}

	/**
	 * Creates and returns a panel object presenting all available distribution
	 * runtime targets in a grid-like dataview.
	 *
	 * @param {Array} targetArray array of available distribution runtime targets
	 * @returns {Ext.Panel} panel containing distribution target dataview
	 */
	function createRuntimeTargetsPanel(targetArray) {
		_log.debug(TAG, "... creating new distribution target panel");
		var store = new Ext.data.JsonStore({
			autoDestroy: true,
			idProperty: 'sid',
			fields: [
				{
					name: 'sid', // session id
					type: 'string'
				},
				{
					name: 'devmod', // device model
					type: 'string'
				},
				{
					name: 'devname', // device name
					type: 'string'
				},
				{
					name: 'csrversion', // version of csr client
					type: 'string'
				},
				{
					name: 'csrname', // name of csr client
					type: 'string'
				},
				{
					name: 'userid', // user id
					type: 'string'
				},
				{
					name: 'devpic', // url of device picture
					type: 'string'
				},
				{
					name: 'distid', // id of corresponding distribution object
					type: 'string'
				}
			]
		});

		// load distribution targets into store
		// and so into the list view
		store.loadData(targetArray);

		var view = new Ext.DataView({
			// binding store object to dataview
			store: store,
			// definition of dataview structure and data-binding
			tpl: new Ext.XTemplate(
				'<tpl for=".">',
				'<div class="thumb-wrap" id="{sid}">',
				'<div class="thumb">',
				'<p><strong>Name:</strong> {devname}</p>',
				'<p><strong>Model:</strong> {devmod}</p>',
				'<p><strong>Client Version:</strong> {csrversion}</p>',
				'<p><strong>Client Name:</strong> {csrname}</p>',
				'<p><strong>User Id:</strong> {userid}</p>',
				'<img src="{devpic}"/>',
				'</div>',
				'</div>',
				'</tpl>',
				'<div class="x-clear"/>'),
			autoHeight: true,
			multiSelect: false,
			singleSelect: true,
			overClass: 'x-view-over',
			itemSelector: 'div.thumb-wrap'
		});

		return new Ext.Panel({
			id: 'dist-target-panel',
			layout: 'fit',
			autoScroll: true,
			flex: 1,
			margins: '5',
			title: 'Available Distribution Runtime Devices',
			items: view
		});
	}

	/**
	 * Helper method to create an view to represent all potential distribution
	 * targets per distribution.
	 *
	 * @param {Documa.ui.distribution.DistributionOption}
	 *            distribution description object
	 * @return {Ext.list.ListView} listview representing several distribution
	 *         targets
	 */
	function createDistributionView(distElem) {
		var targets = [];

		var targetSet = distElem.getRuntimeTargetSet();
		for (var key in targetSet) {
			var targetObj = targetSet[key];

			// creating presentation item of runtime target as preparation of
			// the
			// data-view-binding
			var presentationItem = {
				devname: targetObj.getDeviceName(),
				devmod: targetObj.getDeviceModelName(),
				csrversion: targetObj.getRuntimeVersion(),
				csrname: targetObj.getRuntimeName(),
				sid: targetObj.getSessionId(),
				userid: targetObj.getUserId(),
				devpic: targetObj.getDevicePicture(),
				distid: distElem.getId()
			};

			// add presentation element of runtime target into target array
			targets.push(presentationItem);
		}

		// create panel to present available distribution runtime targets
		var rtPanel = createRuntimeTargetsPanel.call(this, targets);

		// create panel to present all components included in the distribution
		var cmpPanel = createComponentPanel.call(this, distElem.getComponentObjects());

		var self = this;

		return new Ext.Panel({
			id: "distview" + distElem.getId(),
			title: 'Distribution ' + distElem.getId(),
			layout: 'fit',
			autoScroll: true,
			height: 400,
			// definition of children
			items: {
				xtype: "panel",
				layout: {
					type: 'vbox',
					padding: '5',
					align: 'stretch'
				},
				items: [cmpPanel, rtPanel, {
					xtype: 'button',
					text: 'Select',
					iconCls: 'action',
					handler: function (sender, clickEvent) {
						var targets = rtPanel.getComponent(0).getSelectedRecords();
						if (targets.length == 0) {
							Ext.Msg.show({
								title: 'Attention',
								msg: 'Please select a distribution target first!',
								buttons: Ext.Msg.OK,
								icon: Ext.Msg.INFO
							});
							return;
						}
						self._controller.useDistributionTargets(targets);
					}

				}]
			}
		});
	};

	return {
		constructor: function (controller) {
			Documa.ui.distribution.ChoiceDistributionView.superclass.constructor.call(this);
			this._controller = controller;
			this._container = createDistributionContainer.call(this);
		},

		/**
		 *
		 * @param {Documa.distribution.DistributionOption}
		 *            distribution object describing a distribution group with
		 *            several distribution targets
		 */
		appendDistribution: function (distribution) {
			// append given distribution description into store object
			var viewItem = createDistributionView.call(this, distribution);
			this._container.add(viewItem);
			this._container.doLayout();
		},

		/**
		 * Renders the distribution presentation window.
		 */
		show: function () {
			var uiman = Documa.RuntimeManager.getUIManager();
			// check if distribution window is already added to the homescreen
			if (!uiman.isCenterStageChild(DIST_CONTAINER_ID)) {
				uiman.addToCenterStage(this._container);
				uiman.doLayout();
			}

			this._container.doLayout();
			this._container.show();
		},

		/**
		 * Removes distribution options from homescreen and removes all included
		 * distribution options.
		 */
		close: function () {
			var uiman = Documa.RuntimeManager.getUIManager();
			var choiceview = uiman.getChildPanel(DIST_CONTAINER_ID);
			if (choiceview && choiceview === this._container) {
				uiman.removeFromCenterStage(choiceview);
			}
			// remove all distribution options
			this._container.removeAll(true);
		}

	};
})());
