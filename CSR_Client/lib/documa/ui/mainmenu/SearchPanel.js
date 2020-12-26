Ext.namespace('Documa.ui.mainmenu');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.mainmenu.SearchResultView');
Documa.require('Documa.ui.mainmenu.MenuManager');
Documa.require('Documa.ui.mainmenu.Utils');

/**
 * @class
 * @implements {Documa.ui.mainmenu.SearchResultView}
 */
Documa.ui.mainmenu.SearchPanel = Ext.extend(Documa.ui.mainmenu.SearchResultView, (function(){
	var TAG = 'Documa.ui.mainmenu.SearchPanel';
	var _log = Documa.util.Logger;

	/** @type {Ext.Window} */
	var _sp = null;

	/** @type {Documa.ui.mainmenu.MenuManager} */
	var _menuManager = null;
	var _dataView = null;
	var _compStore = null;
	var _reader = null;
	var _toolBar = null;
	var _tpl = null;

	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {Documa.ui.mainmenu.MenuManager} controller
		 */
		constructor: function(controller){
			Documa.ui.mainmenu.SearchPanel.superclass.constructor.call(this);
			this._super = Documa.ui.mainmenu.SearchPanel.superclass;

			_menuManager = controller;
			//reader for the Store which extracts Components from XML String
			_reader = Documa.ui.mainmenu.Utils.getSPARQLResultXMLReader();

			//Store
			_compStore = new Ext.data.Store({
				id: 'sp_componentStore',
				reader: _reader,
				fields: ['name', 'id', 'url', 'docu'],
			});

			// Template for DataView to display Store Records
			// @formatter:off
			_tpl = new Ext.XTemplate(
				'<tpl for=".">',
					'<div class="thumb-wrap" id="{id}">',
						'<p lang="en">{[this.fitStringToPanel(values.name)]}</p>',
						'<div class="thumb"><img src="{url}" title="{docu}"></div>',
					'</div>',
				'</tpl>',
				{
					compiled: true,
					fitStringToPanel: function (string) {
						//checks for String parts longer than 12 characters and hyphenates them
						if (string.length > 13) {
							var counter = 0;
							var regex = new RegExp('[0-9a-zA-Z\.]');
							for (var i = 0; i < string.length; i++) {
								//checks for Alphanumeric Characters in a string to identify long words
								if (regex.test(string.charAt(i))) {
									counter++;
									//if single word is longer than twelve characters hyphenate
									if (counter > 13) {
										//adds hyphen and space
										//uses i-2 to make sure the second part contains at least two characters
										string = string.splice(i - 2, 0, "- <br/>");
										counter = 0;
									}
								} else {
									counter = 0;
								}
							}

							//checks for overall length and clips if necessary (three dots are added to signal the reduction)
							if (string.length > 30) {
								string = string.substr(0, 27) + '...';
							}
						}
						return string;
					}
				}
			);
			// @formatter:on

			//DataView for Store
			_dataView = new Ext.DataView({
				id: 'sp_dataView',
				store: _compStore,
				tpl: _tpl,
				autoHeight: true,
				autoWidth: true,
				itemSelector: '.thumb-wrap',
				emptyText: 'No Components',
				listeners: {
					// handle clicks on items
					'click': {
						fn: function(view, index, node){
							// logic to add selected component to the composition
							var record = view.getStore().getAt(index);
							var recordId = record.data.id;
							_menuManager.integrateCmp(recordId);
						}
					}
				}
			});

			/**
			 * Toolbar of the SearchPanel
			 *
			 * contains slider to manage the number of Components shown
			 *
			 * contains selection if UI and Service Components are shown
			 */
			_toolBar = new Ext.Toolbar({
				dock: 'bottom',
				buttonAlign: 'left',
				items: [
					{
						xtype: 'container',
						layout: 'hbox',
						width: 150,
						items: [
							{
								xtype: 'displayfield',
								id: 'sp_resultCount',
								value: '0 Components',
								fieldLabel: 'Number of Components',
								hideLabel: true,
								width: 125,
								height: 20
							}
						]
					},
					'->',
					{
						xtype: 'container',
						layout: 'hbox',
						width: 200,
						items: [
							{
								xtype: 'tbtext',
								text: 'Show:',
								height: 20
							},
							{
								xtype: 'checkbox',
								id: 'sp_uiCb',
								boxLabel: '',
								inputValue: 'isUi',
								checked: true,
								height: 20,
								width: 20,
								listeners: {
									'check': {
										fn: function(sp_uiCb, isUi){
											var query = Ext.getCmp('tb_search').getValue();
											var maxComps = Ext.getCmp('sp_slider').getValue();
											_menuManager.doSearch(query, isUi, maxComps);
										}
									}
								}

							},
							{
								xtype: 'tbtext',
								text: 'UI',
								height: 20
							},
							{
								xtype: 'checkbox',
								id: 'sp_serviceCb',
								boxLabel: '',
								inputValue: 'isService',
								checked: true,
								height: 20,
								width: 20,
								listeners: {
									'check': {
										fn: function(sp_serviceCb, isService){
											var query = Ext.getCmp('tb_search').getValue();
											var isUi = Ext.getCmp('sp_uiCb').getValue();
											var maxComps = Ext.getCmp('sp_slider').getValue();
											_menuManager.doSearch(query, isUi, maxComps);
										}
									}
								}
							},
							{
								xtype: 'tbtext',
								text: 'Service',
								height: 20
							}
						]
					},
					{
						xtype: 'container',
						layout: 'hbox',
						width: 265,
						items: [
							{
								xtype: 'displayfield',
								id: 'sp_sliderValue',
								value: 'Show 10 Components',
								fieldLabel: 'Show Components',
								hideLabel: true,
								width: 125,
								height: 20
							},
							{
								xtype: 'slider',
								id: 'sp_slider',
								width: 120,
								value: 10,
								increment: 1,
								minValue: 1,
								maxValue: 50,
								height: 20,
								listeners: {
									'change': {
										fn: function(slider){
											Ext.getCmp('sp_sliderValue').setValue('Show ' + slider.getValue() + ' Components'); //show current slider value
										}
									},
									'dragend': {
										fn: function(slider){
											var query = Ext.getCmp('tb_search').getValue();
											var isUi = Ext.getCmp('sp_uiCb').getValue();
											var isService = Ext.getCmp('sp_serviceCb').getValue();
											var maxComps = slider.getValue();
											_menuManager.doSearch(query, isUi, maxComps);
										}
									}
								}
							}
						]
					}
				]

			});

			_sp = new Ext.Window({
				id: 'sp',
				title: 'Search Results',
				draggable: false,
				closable: true,
				collapsible: true,
				hidden: true,
				closeAction: 'hide',
				height: 300,
				maxHeight: 300,
				y: 50,
				padding: 5,
				style: {
					position: 'relative'
				},
				autoScroll: true,
				items: _dataView,
				bbar: _toolBar
			});
		},

		fillResultStore: function(results){
			_compStore.loadData(results); //Load results in the Store
		},

		/**
		 * Loads search results into the search result view.
		 * @param {ComponentSearchResult} results
		 */
		loadResults: function(results){
			// load results in the Store
			_compStore.loadData(results.results);
		},

		show: function(){
			_sp.render(document.body, 2); //TODO Adding Search Panel to the end of the Main Menu Container
		},

		refresh: function(){
			_dataView.refresh(); //rerender Template
			var count = _compStore.getCount();
			Ext.getCmp('sp_resultCount').setValue(count + ' Components');
			_sp.doLayout(); //rerender SearchPanel
			_sp.setVisible(true);
			_sp.expand();
		},

		/**
		 * @returns {boolean}
		 */
		isVisible: function(){
			return _sp.isVisible();
		},

		hide: function(){
			_sp.hide();
		}
	};
})());