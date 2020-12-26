Ext.namespace("Documa.ui");

Documa.require('Documa.ui.config.ConfigManager');
Documa.require('Documa.ui.mainmenu.MenuManager');
Documa.require('Documa.ui.homescreen.HomeScreenController');
Documa.require('Documa.ui.layout.LayoutManager');
Documa.require('Documa.ui.components.ComponentsLoaderView');
Documa.require('Documa.ui.sidebar.SidebarManager');
Documa.require('Documa.ui.capviewconfiguration.ConfigCVManager');
Documa.require('Documa.ui.migration.MigrationManager');
Documa.require('Documa.ui.views.BaseView');
Documa.require('Documa.ui.views.MetaView');
Documa.require('Documa.ui.views.capview.CapView');
Documa.require('Documa.ui.views.profview.ProfView');
Documa.require('Documa.ui.views.histview.HistView');
Documa.require('Documa.ui.meta.MetaUIController');
Documa.require('Documa.ui.utility.GenericLoadingSpinner');

Documa.ui.UIElementIds = {
	CENTERSTAGE: "centralViewPortPanel",
	APPMENUPANEL: "appMenuPanel",
	VIEWPORTID: "csr-viewport"
};

/**
 * Central class to define the user interface of the client-side mashup runtime environment.
 *
 * @class
 */
Documa.ui.UIManager = Ext.extend(Object, (function () {
	var TAG = "Documa.ui.UIManager";
	var _log = Documa.util.Logger;
	var _util = Documa.util.Util;

	var CENTRAL_PANEL = "centralViewPortPanel";
	var APPMENU_PANEL = "appMenuPanel";
	var LEFT_PANEL = "leftPanel";
	var RIGHT_PANEL = "rightPanel";
	var CLS_LOADERMSG = "cls_loadermsg";
	var VIEWPORTID = "csr-viewport";

	/**
	 * describes the active View (liveView, CapView, ProfView) (OBJECT, NOT A STRING!)
	 */
	var _activeView = null;

	/**
	 * Responsible for calculating and modifying appliocation specific layouts
	 * @type {Documa.ui.layout.LayoutManager}
	 */
	var _layoutManager = null;

	/**
	 * @type {Documa.ui.config.ConfigManager}
	 */
	var _configManager = null;

	/**
	 * Provides access to the homescreen that lists available applications and
	 * creates specific commands, e. g. STARTAPP command
	 *
	 * @type {Documa.ui.homescreen.HomeScreenController}
	 */
	var _homescreenController = null;

	/**
	 * Contains application menu items, e. g. search panel.
	 */
	var _menuManager = null;

	/**
	 * Contains the viewport that is the base of the whole ui-layer of the csr
	 * client.
	 */
	var _viewPort = null;

	/**
	 * Contains home screen and component views.
	 * @type {Ext.Panel}
	 * @private
	 */
	var _centerStage = null;

	/**
	 * Contains left side stage of viewport.
	 * @type {Ext.Panel}
	 * @private
	 */
	var _leftStage = null;

	/**
	 * Contains right side stage of viewport.
	 * @type {Ext.Panel}
	 * @private
	 */
	var _rightStage = null;

	/**
	 * Connects Sidebar Manager with Sidebar View
	 * @type {Documa.ui.sidebar.SidebarManager}
	 * @private
	 */
	var _sidebarManager = null;

	/**
	 * Connects CapViewConfig Manager with CapViewConfig View
	 * @type {Documa.ui.capviewconfiguration.ConfigCVManager}
	 * @private
	 */
	var _configCVManager = null;
	
    /**
     * @type {Documa.ui.migration.MigrationManager}
     * @private
     */
    var _migrationManager = null;

	/**
	 * Contains application menu, which consists of a component search panel etc.
	 */
	var _appMenu = null;

	/**
	 * Represents loading state of components.
	 */
	var _componentsLoader = null;

	/**
	 * Reference to the meta ui controller.
	 * @type {Documa.ui.meta.MetaUIController}
	 * @private
	 */
	var _metaUIController = null;

	/**
	 * Represents a generic spinner which can be used to indicate when something is loading.
	 * @type {Documa.ui.utility.GenericLoadingSpinner}
	 */
	var _genericLoadingSpinner = null;

	/**
	 * Reference to the device panel controller.
	 * TODO: @type {null}
	 * @private
	 */
	var _devicePanelController = null;

	/**
	 * CapView
	 * @type {Documa.ui.capview.CapView}
	 * @private
	 */
	var _capView = null;

	/**
	 * @type {Documa.ui.histview.HistView}
	 * @private
	 */
	var _histView = null;
	/**
	 * Is the currently active view a child of the baseview?
	 * @return {boolean} true if the active view inherits from the BaseView; otherwise false
	 */
	function activeViewIsChildOfBaseView() {
		//return activeView && ((_activeView instanceof Documa.ui.views.capview.CapView) || (_activeView instanceof Documa.ui.views.profview.ProfView));
		return _activeView && (_activeView instanceof Documa.ui.views.BaseView);
	}

	return {
		/**
		 * Ctor.
		 * @constructor
		 */
		constructor: function () {
			Documa.ui.UIManager.superclass.constructor.call(this);
			var self = this;

			// creating a generic loading spinner
			_genericLoadingSpinner = new Documa.ui.utility.GenericLoadingSpinner();

			// init homescreen that presents available, shareable/joinable applications
			_homescreenController = new Documa.ui.homescreen.HomeScreenController();

			// init layout manager
			_layoutManager = new Documa.ui.layout.LayoutManager(this);

			// init config manager
			_configManager = new Documa.ui.config.ConfigManager();

			// init meta ui controller
			_metaUIController = new Documa.ui.meta.MetaUIController(this);

			// capview
			_capView = new Documa.ui.views.capview.CapView(_layoutManager, 'capview');

			// histview
			_histView = new Documa.ui.views.histview.HistView(_layoutManager, 'histview');


			// init menu manager
			_menuManager = new Documa.ui.mainmenu.MenuManager(this);

			// instantiate component loader view
			_componentsLoader = new Documa.ui.components.ComponentsLoaderView();

			//init sidebar controller
			_sidebarManager = new Documa.ui.sidebar.SidebarManager();

			//init capviewconfig controller
			_configCVManager = new Documa.ui.capviewconfiguration.ConfigCVManager();

			// init migration manager
            _migrationManager = new Documa.ui.migration.MigrationManager(this);

			// init of center stage
			_centerStage = new Ext.Panel({
				id: CENTRAL_PANEL,
				baseCls: 'centralViewPortPanel',
				region: 'center',
				layout: 'card',
				showHeader: false,
				border: false,
				bodyBorder: false,
				autoScroll: true,
				activeItem: 0,
				listeners: {
					afterlayout: function () {
						_capView.redrawConnections();
						_log.debug(TAG, "... center stage layouted!");
					}
				}
			});

			// init app menu
			_appMenu = new Ext.Panel({
				id: APPMENU_PANEL,
				baseCls: 'appmenuPanel',
				layout: 'absolute',
				region: 'north',
				split: false,
				margins: '0',
				showHeader: false,
				border: false,
				autoScroll: true,
				height: 50
			});

			// init left stage
			_leftStage = new Ext.Panel({
				id: LEFT_PANEL,
				title: "Control",
				layout: 'fit',
				region: 'west',
				cmargins: '5 5 0 0',
				//collapseFirst: false,
				collapsible: true,
				floatable: true,
				//collapsed: true,
				split: false,
				margins: '0',
				header: true,
				border: false,
				autoScroll: true,
				width: 200,
				minSize: 100,
				maxSize: 250
			});

			//create the viewport at first
			_viewPort = new Ext.Viewport({
				id: Documa.ui.UIElementIds.VIEWPORTID,
				layout: 'border',
				bufferResize: true,
				//hidden:true,
				items: [_appMenu, _centerStage],
				listeners: {
					render: function (component) {
						// viewport was rendered
						self.onRendered();
					}
				}
			});

			// adding stack of component views to center stage
			this.addToCenterStage(_layoutManager.getViewStack());

			// adding homescreen application list panel
			//this.addToCenterStage(_homescreenController.getView().getHomeScreenPanel());

			// adding the metaui container
			this.addToCenterStage(_metaUIController.getMetaUIView().getContainer());

			// TODO: add here further subpanels to viewport

            // adding the new capview
            this.addToCenterStage(_histView.getHistViewPanel());

			// adding the new capview
			this.addToCenterStage(_capView.getCapViewPanel());

			// homescreen panel on start
			_homescreenController.getView().hide();

			// hide metaui on start
			_metaUIController.getMetaUIView().hide();

			// hide capview on start
			_capView.getCapViewPanel().hide();

			// all viewport modifications are done --> recalculate viewport layout
			_viewPort.doLayout();
		},

		/**
		 * Shows loader message.
		 *
		 * @param {String} message shown as part of the loader mask
		 */
		showLoader: function (message) {
			this._loader = new Ext.LoadMask(Ext.getBody(), {
				msg: message
			});
			this._loader.show();
		},

		/**
		 * Called after the viewport was rendered.
		 */
		onRendered: function () {
			_log.debug(TAG, "... viewport rendered!");
			setTimeout(function () {
				// starting loading predefined strategy models
				_layoutManager.loadStrategyModels();
			}, 1000);
		},

		/**
		 * Hides loader mask.
		 */
		hideLoader: function () {
			this._loader.hide();
		},

		/**
		 * Shows error message as part of the homescreen.
		 * @param {String} errormsg message containing error information
		 */
		showError: function (errormsg) {
			this._loader.hide();
			Ext.Msg.show({
				title: "Error!",
				width: 400,
				height: 300,
				buttons: Ext.MessageBox.OK,
				closable: true,
				icon: Ext.MessageBox.ERROR,
				modal: true,
				msg: errormsg
			});
		},

		/**
		 * Shows info message as part of the homescreen.
		 * @param message
		 */
		showInfo: function (message) {
			Ext.Msg.show({
				title: "Migration cancelled!",
				width: 500,
				height: 400,
				buttons: Ext.MessageBox.OK,
				closable: true,
				icon: Ext.MessageBox.INFO,
				modal: true,
				msg: message
			});
		},

		/**
		 * Recalculates layout of the homescreen view
		 */
		doLayout: function () {
			_viewPort.doLayout();
		},

		/**
		 * Presents list of applications via the homescreen functionalities.
		 *
		 * @param {Array} list of app descriptors
		 */
		showApplications: function (applist) {
			// present applications list via homescreen
			//_homescreenController.show(applist);
			//_metaUIController.showApplicationList(applist);
			this.doLayout();
		},

		/**
		 * Adds application discription object into list of available applications.
		 * The added object represents another active application started by the user
		 * of this runtime environment.
		 *
		 * @param {ApplicationPayload} app application descriptor
		 */
		addApplication: function (app) {
			//_homescreenController.addApplication(app);
			// id, name, version, initr, instid
			this.getMetaUIController().getMetaUIView().addRunningApplication(app.id, app.name, app.version,
				app.initr.user.uname, app.instid, app.state);
		},

		/**
		 * Adds a transparent div on top of the integrated component, which user can only
		 * view, called by the client's Access Control Manager
		 *
		 * @param {String} the id of the component instance
		 */
		addTransparentDiv: function (instance) {
			var container = Documa.RuntimeManager.getComponentManager().getContainerElementById(instance);
			var componentId = container.getComponentID();
			var containerWidth = container.getContainerElement().style.width;
			var containerHeight = container.getContainerElement().style.height;

			Ext.DomHelper.append(componentId, {
				tag: 'div',
				cls: 'transparentDiv',
				id: 'transparentDiv',
				style: {
					width: containerWidth,
					height: containerHeight,
					top: '1px'
				}
			});
		},

		/**
		 * Removes a transparent div from the integrated component in case of changing
		 * user's right,
		 * called by the client's Access Control Manager
		 *
		 * @param {String} the id of the component instance
		 */
		removeTransparentDiv: function (instance) {
			var container = Documa.RuntimeManager.getComponentManager().getContainerElementById(instance);
			var componentId = container.getComponentID();

			var componentEl = Ext.get(componentId);
			componentEl.child(".transparentDiv").remove();
		},

		/**
		 * Displays user's right to the integrated component
		 *
		 * @param {String} the id of the component instance
		 * @param {String} user's access right to the component
		 */
		displayUserRight: function (instance, right) {
			var container = Documa.RuntimeManager.getComponentManager().getContainerElementById(instance);
			var componentId = container.getComponentID();

			var componentEl = Ext.get(componentId);
			if (!componentEl.child(".userRight")) {
				Ext.DomHelper.append(componentId, {
					tag: 'div',
					cls: 'userRight',
					html: '<p>Permission: ' + right + '</p>'
				});
			} else {
				var rightDiv = componentEl.child(".userRight");
				rightDiv.child("p").remove();

				var newRight = '<p>Permission: ' + right + '</p>';
				Ext.DomHelper.append(rightDiv, newRight);
			}
		},

		/**
		 * Returns child panel with specified name.
		 *
		 * @return {Ext.Container | Ext.Panel}
		 */
		getChildPanel: function (panelId) {
			return _viewPort.findById(panelId);
		},

		/**
		 * Returns the application menu panel of the viewport on presentation layer.
		 *
		 * @return {Ext.Panel}
		 */
		getMenuPanel: function () {
			return _appMenu;
		},

		/**
		 * Returns left side stage.
		 * @returns {Ext.Panel}
		 */
		getLeftStage: function () {
			return _leftStage;
		},

		/**
		 * Returns the center stage panel of the viewport on presentation layer.
		 *
		 * @returns {Ext.Panel}
		 */
		getCenterStage: function () {
			return _centerStage;
		},

		/**
		 * Returns true if center stage contains a child container with the specified id.
		 *
		 * @param {String} id child's id
		 */
		isCenterStageChild: function (id) {
			if (_centerStage.findById(id)) {
				return true;
			}

			return false;
		},

		/**
		 * Activates specified item on center stage.
		 *
		 * @param {Ext.Container} item center stage item to be activated
		 */
		setCenterStageItemActive: function (item) {
			_log.debug(TAG, "... activating item {" + item.getId() + "} on center stage.");
			// test if item is part of the center stage stack
			if (_centerStageStack.indexOf(item) < 0)
				throw new Error("Item was not added to the center stage.");

			// remove item from stack to set it on top
			_util.removeElement(item, _centerStageStack);

			// add item to the stack and to the center stage
			this.addToCenterStage(item);
			_centerStage.doLayout();
		},

		/**
		 * Switch panel on center stage.
		 * @param {Ext.Container} view
		 */
		setCenterStageView: function (view) {
			_centerStage.layout.setActiveItem(view.getId());
			if(view.getId() === "csr-mui-mainframe-block") this.setActiveView(null);
			view.show();
		},

		/**
		 * Adding given container to viewport's center stage.
		 *
		 * @param {Ext.Container} container visual container that may contain other
		 * components
		 */
		addToCenterStage: function (container) {
			_log.debug(TAG, "... adding container {" + container.getId() + "} to center stage.");
			try {
				_centerStage.add(container);
				_centerStage.getLayout().setActiveItem(container.getId());
				_viewPort.doLayout();
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},

		/**
		 * Removes specified container from viewport's center stage.
		 *
		 * @param {Ext.Container} container visual container to remove from center stage
		 */
		removeFromCenterStage: function (container) {
			_log.debug(TAG, "... adding container {" + container.getId() + "} to center stage.");
			try {
				//if (container.getLayout() instanceof Ext.layout.CardLayout) {
				// remove fit panel of card layouted container
				//	_centerStage.remove("csr-parent_" + container.getId());
				//} else {
				// remove container from center stage stack
				_centerStage.remove(container);
				//}
				_viewPort.doLayout();
			} catch (error) {
				_log.trace(TAG, error);
			}
		},

		/**
		 * Adds given container to left stage.
		 *
		 * @param {Ext.Container} container
		 */
		addToLeftStage: function (container) {
			_log.debug(TAG, "... adding container {" + container.getId() + "} to left stage.");
			try {
				_leftStage.add(container);
				_viewPort.doLayout();
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},

		/**
		 * Returns the current height of the canvas
		 *
		 * @return {Number}
		 */
		getCanvasHeight: function () {
			var myHeight = 0;
			if(typeof (window.innerHeight) === 'number') {
				//Non-IE
				myHeight = window.innerHeight;
			} else if (document.documentElement && document.documentElement.clientHeight) {
				//IE 6+ in 'standards compliant mode'
				myHeight = document.documentElement.clientHeight;
			} else if (document.body && document.body.clientHeight) {
				//IE 4 compatible
				myHeight = document.body.clientHeight;
			}
			return myHeight;
		},

		/**
		 * Returns the current width of the canvas
		 *
		 * @return {Number}
		 */
		getCanvasWidth: function () {
			var myWidth = 0;
			if(typeof (window.innerWidth) === 'number') {
				//Non-IE
				myWidth = window.innerWidth;
			} else if (document.documentElement && document.documentElement.clientWidth) {
				//IE 6+ in 'standards compliant mode'
				myWidth = document.documentElement.clientWidth;
			} else if (document.body && document.body.clientWidth) {
				//IE 4 compatible
				myWidth = document.body.clientWidth;
			}
			return myWidth;
		},

		/**
		 * Returns controller object of homescreen.
		 *
		 * @return {Documa.homescreen.HomeScreenController}
		 */
		getHomeScreenController: function () {
			return _homescreenController;
		},

		/**
		 * Returns sidebar manager which provides sidebar functionalities.
		 * @returns {Documa.ui.sidebar.SidebarManager}
		 */
		getSidebarManager: function () {
			return _sidebarManager;
		},

		/**
		 * Returns CVConfig manager which provides CVConfig functionalities.
		 * @returns {Documa.ui.capviewconfiguration.ConfigCVManager}
		 */
		getCVConfigManager: function () {
			return _configCVManager;
		},
		

        /**
         * @returns {Documa.ui.migration.MigrationManager}
         */
        getMigrationManager: function () {
            return _migrationManager;
        },

		/**
		 * Returns layout manager responsible for layout
		 *
		 * @return {Documa.ui.layout.LayoutManager}
		 */
		getLayoutManager: function () {
			return _layoutManager;
		},

		/**
		 * Returns config manager that is responsible for management of different
		 * configurations of CapView and ProfView layouts.
		 *
		 * @return {Documa.ui.config.ConfigManager}
		 */
		getConfigManager: function () {
			return _configManager;
		},

		/**
		 * Returns components load progress view that presents the loading progress of
		 * each component container.
		 *
		 * @return {Documa.ui.components.ComponentLoaderView}
		 */
		getComponentsLoadView: function () {
			return _componentsLoader;
		},

		/**
		 * Returns menu manager that provides access to menubar functionalities, e. g.
		 * searching a component etc.
		 *
		 * @return {Documa.ui.mainmenu.MenuManager}
		 */
		getMenuManager: function () {
			return _menuManager;
		},

		/**
		 * Renders upper application menubar.
		 */
		showMenuBar: function () {
			// renders menuview into menu panel
			_menuManager.getMenuView().render(_appMenu);

			$('#tb_searchSubmit button').tooltip({
				placement: 'bottom',
				title: 'Search',
				container: 'body',
			});
			$('#tb_recBtn button').tooltip({
				placement: 'bottom',
				title: 'Recommendations',
				container: 'body',
			});
			$('#tb_messageBtn button').tooltip({
				placement: 'bottom',
				title: 'Messages',
				container: 'body',
			});
			$('#tb_viewBtn button').tooltip({
				placement: 'bottom',
				title: 'Views',
				container: 'body',
			});
			$('#tb_collaborationMenu button').tooltip({
				placement: 'bottom',
				title: 'Collaboration Menu',
				container: 'body',
			});
			$('#tb_mainMenu button').tooltip({
				placement: 'bottom',
				title: 'Application Menu',
				container: 'body',
			});
			$('#tb_viewbindingBtn button').tooltip({
				placement: 'bottom',
				title: 'Show Viewbindings',
				container: 'body',
			});
			$('#tb_LogoutBtn button').tooltip({
				placement: 'left',
				title: 'Logout',
				container: 'body',
			});

			_viewPort.doLayout();
		},

		/**
		 * Hides menu bar.
		 */
		hideMenuBar: function () {
			_appMenu.hide();
			_viewPort.doLayout();
		},

		/**
		 * Method to load search results from server-side core service to the search
		 * panel store object.
		 *
		 * @param {Documa.communication.Message} searchresults
		 */
		showSearchResults: function (searchresults) {
			var sp = _menuManager.getSearchResultView();
			sp.show();
			/** @type {ComponentSearchResult} */
			var searchResult = searchresults.getPayload();
			//sp.fillResultStore(searchResult.results);
			sp.loadResults(searchResult);
			sp.refresh();
		},

		/**
		 * Method to change between the Views
		 *
		 * @param view String contains the new active View
		 */
		setAndShowActiveView: function (view) {
			/*
			if (_activeView && ((_activeView instanceof Documa.ui.views.capview.CapView) ||
				(_activeView instanceof Documa.ui.views.profview.ProfView))) {
				// Ensure that the old view is closed
				_activeView.closeView();
				_activeView = null;
			}
			*/
			if (_activeView) {
				_activeView.closeView();
				_activeView = null;
			}
			//show loading spinner
			_genericLoadingSpinner.show(view);

			// Create LiveView Object and add as View Object to active View
			switch (view) {
				//case 'capViewConfig':
				//	//hide loading spinner
				//	_activeView = _capViewConfig;
				//	//_genericLoadingSpinner.hide();
				//	//this.setCenterStageView(_layoutManager.getViewStack());
				//	this.setCenterStageView(_capView.getCapViewPanel());
				//	_centerStage.doLayout();
				//	_log.debug(TAG, " switched to CapViewConfig");
				//	break;
				case 'liveView':
					//hide loading spinner
					_genericLoadingSpinner.hide();
					this.setCenterStageView(_layoutManager.getViewStack());
					_centerStage.doLayout();
					break;
				case 'capView':
					//_activeView = new Documa.ui.views.capview.CapView(_layoutManager, view);
					_activeView = _capView;
					this.setCenterStageView(_capView.getCapViewPanel());
					_centerStage.doLayout();
					_log.debug(TAG, " switched to CapView");
					break;
				case 'histView':
					_activeView = _histView;
					this.setCenterStageView(_histView.getHistViewPanel());
					_centerStage.doLayout();
					_log.debug(TAG, " switched to HistView");
					break;
				case 'profView':
                    _activeView = new Documa.ui.views.profview.ProfView(_layoutManager, view);
					_log.debug(TAG, " switched to ProfView");
					break;
			}
			if (_activeView !== null) {
				_activeView.show();
			}
			//hide loading spinner
			_genericLoadingSpinner.hide();
		},

		/**
		 * Add a new visual connection the view.
		 * Normally triggered by the application changed event.
		 * @param {Object} channel The communication channel the should be added to the view
		 */
		addVisualConnection: function (channel) {
			if(!channel) {
				throw new Error("Channel object is missing.");
			}

			if (activeViewIsChildOfBaseView()) {
				_activeView.addVisualConnection(channel);
			}
		},

		/**
		 * Remove a new visual connection the view.
		 * Normally triggered by the application changed event.
		 * @param {String} channelID The ID of the Channel that should be removed
		 */
		removeVisualConnection: function (channelID) {
			if(!channelID) {
				throw new Error("Channel object is missing.");
			}

			if (activeViewIsChildOfBaseView()) {
				_activeView.removeVisualConnection(channelID);
			}
		},

		/**
		 * Method to return the current active view.
		 * @returns {Object}
		 */
		getActiveView: function () {
			return _activeView;
		},

		/**
		 * Slides in left stage.
		 */
		slideLeftStageIn: function () {
			_viewPort.layout.west.slideIn();
		},

		/**
		 * Slides out left stage.
		 */
		slideLeftStageOut: function () {
			_viewPort.layout.west.slideOut();
		},

		/**
		 * Method determines child id.
		 * @param {Object} child
		 */
		getChildId: function (child) {
			//var layout = child.getLayout();
			//if ( layout instanceof Ext.layout.CardLayout || layout === "card" || layout.type === "card") {
			//	return "csr-parent_" + child.getId();
			//} else {
			return child.getId();
			//}
		},

		/**
		 * Methods to find the actual X Position of a Dom Node Element
		 * (The returned Value is the absolute x position of the element independet of the current scrolling position of the document)
		 *
		 * @param domNode dom node element
		 * @returns {number}
		 */
		findPosX: function (domNode) {
			var currentLeft = 0;
			if (domNode.offsetParent) {
				while (1) {
					currentLeft += domNode.offsetLeft;
					if (!domNode.offsetParent) {
						break;
					}
					domNode = domNode.offsetParent;
				}
			} else if (domNode.x) {
				currentLeft += domNode.x;
			}
			return currentLeft;
		},
		/**
		 * Methods to find the actual Y Position of a Dom Node Element
		 * (The returned Value is the absolute y position of the element independet of the current scrolling position of the document)
		 *
		 * @param domNode dom node element
		 * @returns {number}
		 */
		findPosY: function (domNode) {
			var currentTop = 0;
			if (domNode.offsetParent) {
				while (1) {
					currentTop += domNode.offsetTop;
					if (!domNode.offsetParent) {
						break;
					}
					domNode = domNode.offsetParent;
				}
			} else if (domNode.y) {
				currentTop += domNode.y;
			}
			//Menu Bar offset
			currentTop -= jQuery('#mainMenuToolBar').height();
			return currentTop;
		},

		/**
		 * Activates the metaui as a child of the UI's center stage.
		 */
		showMetaUI: function () {
			this.getCenterStage().getLayout().setActiveItem(_metaUIController.getMetaUIView().getContainer().getId());
		},

		/**
		 * Returns distribution dialog.
		 *
		 * @return {Documa.ui.distribution.DistributionView}
		 */
		getDistributionView: function () {
			return Documa.RuntimeManager.getApplicationContext().getDistributionManager().getDistributionView();
		},

		/**
		 * Returning meta ui controller.
		 * @returns {Documa.ui.meta.MetaUIController}
		 */
		getMetaUIController: function () {
			return _metaUIController;
		},

		/**
		 * Method to return the generic loading spinner instance.
		 * @returns Object of the Spinner
		 */
		getGenericLoadingSpinner: function () {
			return _genericLoadingSpinner;
		},

		getCapView: function () {
			return _capView;
		},

		getHistView: function () {
			return _histView;
		},

		setActiveView: function (view) {
			_activeView = view;
		},

		/**
		 * Shows confirmation dialog to choose 'yes' or 'no'. If user chooses 'yes' the callback is executed.
		 * @param {String} confirmation text
		 * @param {Function} callback function if the user confirms
		 */
		showConfirmationDialog : function(confirmationText, callback) {
			//this._loader.hide();
			Ext.Msg.confirm('Confirm', confirmationText, callback);
		}

	};
})());
