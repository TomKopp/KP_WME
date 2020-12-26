Ext.namespace('Documa.ui.views');

Documa.require('Documa.util.Logger');

/**
 * Class to show Service Components in an extra Panel at the bottom of the central viewport
 *
 * @autor Robert Starke
 */

Documa.ui.views.ServiceComponentPanel = Ext.extend(Object, (function() {
	var TAG = 'Documa.ui.views.ServiceComponentPanel';
	var _log = Documa.util.Logger;

	var _serviceComponentTemplate = null;
	var __serviceComponentStore = null;
	var _serviceComponentView = null;
	var _serviceComponentPanel = null;

	// template for each service component
	_serviceComponentTemplate = new Ext.XTemplate(
		'<tpl for=".">',
			'<div id="service-{instanceId}" class="service-component">',
		'<div class="service-component-name">',
				'<div class="x-tool x-tool-close" id="{instanceId}-close-button">&nbsp;</div>',
					'{name}',
				'</div>',
				'<div class="service-component-body">',
					'<img src="{picture}" alt="{name}" class="service-icon"/>',
				'</div>',
			'</div>',
		'</tpl>',
		{
			compiled: true,
		}
	);

	// Store containing instanceIDs, names and pictures of all service components
	_serviceComponentStore = new Ext.data.JsonStore({
		id: 'sc-store',
		fields:['instanceId', 'name', 'picture'],
		idIndex: 0,

	});

	// view which renders the template for each service components
	_serviceComponentView = new Ext.DataView({
		id: 'sc-view',
		cls: 'sc-view clearfix',
		tpl: _serviceComponentTemplate,
		store: _serviceComponentStore,
		autoHeight: true,
		hidden: false,
		listeners:{
			click: function(_serviceComponentView, index, node, e ){
				var target = e.getTarget();

				// handeling click on the close button of a service component
				if(jQuery(target).hasClass('x-tool-close')){
					var deleteButtonInstanceId = target.id;
					var instanceId = deleteButtonInstanceId.split('-')[0];

					var msg = 'Are you sure you want to delete the whole component?';

					// calls confirmation dialog in the ui manager
					Documa.RuntimeManager.getUIManager().showConfirmationDialog(msg, function(choice){
						if(choice == 'yes'){
							var uiManager = Documa.RuntimeManager.getUIManager();
							var serviceComponentPanel = uiManager.getServiceComponentPanel();
							serviceComponentPanel.removeServiceComponentFromStore(instanceId);
						}
					});
				}
			}
		}

	});

	// Window which is located in the bottom region of the central viewport
	_serviceComponentWindow = new Ext.Panel({
		id: 'sc-panel',
		title: 'Service Components',
		autoHeight: true,
		showHeader: true,
		collapsible: true,
		closable: false,
		cls: 'sc-panel',
		region: 'south',
		items:[_serviceComponentView],
		hidden:false,
	});

	return {
		constructor: function(){
			_serviceComponentWindow.add(_serviceComponentView);
			_serviceComponentWindow.doLayout();
			Ext.getCmp('centralViewPortPanel').doLayout();
		},

		/**
		 * Method to load all service components to the store and show them in the view
		 *
		 * @param {Object} serviceComponents Object containing all service components
		 */
		updateServiceComponentStore : function(serviceComponents){
			_serviceComponentStore.loadData(serviceComponents);
			_serviceComponentWindow.doLayout();
			_serviceComponentWindow.show();
			_serviceComponentView.show();
		},

		/**
		 * Function to expand the view (overrides normal show action)
		 */
		show : function(){
			_serviceComponentWindow.expand();
		},

		/**
		 * function to collapse the view (overrides normal close action)
		 */
		close : function(){
			_serviceComponentWindow.collapse();
		},

		/**
		 * method returns the service component window
		 *
		 * @return {Ext.Window} _serviceComponentWindow Ext.Window object containing the service component view
		 */
		getPanel : function(){
			return _serviceComponentWindow;
		},

		/**
		 * method returns the dom nodes of the service components
		 *
		 * @return {Array} Array containing dom nodes of the service components
		 */
		getServiceComponentDomNodes: function(){
			return jQuery('#sc-panel .service-component').toArray();
		},

		/**
		 * method returns a dom node of a single service component
		 *
		 * @return {DomNode} Dom node of a single service component
		 */
		getSingleServiceComponentDomNode: function(instanceId){
			return jQuery('#service-component-' + instanceId).get(0);
		},

		/**
		 * method to remove a specific service component from the store
		 * this method is called if a service component is removed by closing it in the LiveView, CapView or BaseView
		 *
		 * @param {String} instanceId ID of the service component which should be deleted
		 */
		removeServiceComponentFromStore: function(instanceId){
			var index = _serviceComponentStore.findExact('instanceId', instanceId);
			_serviceComponentStore.removeAt(index);
			_serviceComponentView.refresh();
		}
	};
})());