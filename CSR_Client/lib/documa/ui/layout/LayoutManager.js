Ext.namespace('Documa.ui.layout');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.layout.View');
Documa.require('Documa.ui.layout.AbsoluteLayout');
Documa.require('Documa.ui.layout.CoslamBasis');
Documa.require('Documa.collaboration.CoordinationManager');
Documa.require('Documa.ui.layout.strategy.LayoutContext');
Documa.require('Documa.ui.layout.strategy.LayoutContextState');
Documa.require('Documa.ui.layout.strategy.LayoutInterpreter');
Documa.require('Documa.ui.layout.strategy.LayoutStrategy');
Documa.require('Documa.ui.layout.strategy.LayoutSelectionView');
Documa.require('Documa.ui.layout.strategy.LocalPreferences');

/**
 * @class
 */
Documa.ui.layout.LayoutManager = Ext.extend(Object, (function () {
	const TAG = "Documa.ui.layout.LayoutManager";
	const _log = Documa.util.Logger;
	var CSR_CMP_PANEL = "csr-cmp-panel";
	var CSR_CMP_PANEL_PADDING = 15;
	var CSR_CMP_PADDING = 15;
	var CSR_CMP_BORDER = 1;
	var CSR_CMP_MARGIN = 5;
	var CSR_CMP_HEADER_PADDING = 5;
	var CSR_CMP_HEADER_MARGIN = 15;
	var CSR_CMP_SCROLLBAR_SIZE = 10;

	/** Observation interval in milliseconds*/
	var RESIZE_OBSERVATION_INTERVAL = 700;

	/*var _strategyPaths = [
		"res/strategies/ColumnLayout.xml",
		"res/strategies/FlowLayout.xml",
		"res/strategies/GridLayout.xml",
		"res/strategies/ListLayout.xml",
		"res/strategies/BigOverSmallLayout.xml",
		"res/strategies/SmallOverBigLayout.xml",
		"res/strategies/SingleComponentLayout.xml"];
	*/
	var _strategyPaths = [];

	/**
	 * Helper method returns fallback component panel.
	 */
	function createFallbackComponentPanel(fallbackView) {
		return new Ext.Panel({
			id: fallbackView.getName(),
			autoScroll: true,
			/*layout: {
				type: 'fit'
			 },*/
			bodyBorder: false,
			border: false
		});
	}

	/**
	 * Helper method returns component panel that can contain
	 * several view layers as card stack item.
	 */
	function createViewStack() {
		return new Ext.Panel({
			id: CSR_CMP_PANEL,
			layout: 'fit',
			//hideMode: 'visibility',
			autoScroll: false,
			bodyBorder: false,
			border: false
		});
	}

	/**
	 * Returns layout strategy that is applicable and has the best rating value.
	 *
	 * @returns {Documa.ui.layout.strategy.LayoutStrategy | null}
	 */
	function getOptimalLayoutStrategy() {
		// determine alternative layout strategy
		var currentBest = null;
		var applicableStrategies = this.getApplicableLayoutStrategies();

		// getting strategy that is applicable and has the maximal rating value
		for (var i = 0; i < applicableStrategies.length; ++i) {
			var s = applicableStrategies[i];
			if (currentBest == null)
				currentBest = s;
			else {
				if (s.getRatingValue() > currentBest.getRatingValue())
					currentBest = s;
			}
		}
		return currentBest;
	}

	/**
	 * Helper method for evaluating currently selected layout strategy and if not applicable try another one.
	 * This function is called at the end of an viewport resize or composition changed event.
	 */
	function evaluateAndApplyLayoutStrategy() {
		/**
		 * Helper method for getting alternative layout strategy.
		 */
		var applyAlternativeStrategy = function () {
			var optStrategy = getOptimalLayoutStrategy.call(this);
			if (optStrategy != null)
				this._currentStrategy = optStrategy.id;

			// apply current strategy
			this.applyStrategy(this._currentStrategy);
		};

		if (this._selectionContext == null) {
			// try to apply an alternative layout strategy
			applyAlternativeStrategy.call(this);
		} else {
			// getting preference object including previously active layout context
			var preference = this._localPreferences.getPreference(this._selectionContext);
			// getting layout strategy from local layout preference
			var selectedStrategy = this.getStrategyById(preference.strategyId);
			if (preference && selectedStrategy && selectedStrategy.isApplicable()) {
				// current strategy is applicable
				this.applyStrategy(selectedStrategy.id);
			} else {
				// try to apply an alternative layout strategy
				applyAlternativeStrategy.call(this);
			}
		}
	}

	/**
	 * Public methods of LayoutManager.
	 */
	return {
		/**
		 * Constructor.
		 * @constructs
		 *
		 * @param {Documa.ui.UIManager} uiManager
		 */
		constructor: function (uiManager) {
			Documa.ui.layout.LayoutManager.superclass.constructor.call(this);
			this._fallbackView = new Documa.ui.layout.View("fallbackLayout", new Documa.ui.layout.CoslamBasis({
				name: 'fallbackLayout',
				agile: false,
				styles: []
			}));

			var self = this;

			/**
			 * AJAX loader for getting the strategy models
			 */
			this._strategyLoader = {

				/**
				 * State variables for content saving
				 */
				_currentPath: null,
				_contentLoaded: false,
				_currentTextResult: null,
				_currentXMLResult: null,

				/**
				 * Loads a file from a specified path
				 *
				 * @param path
				 *            The relative path from which to load the
				 *            file
				 * @param onContentLoaded
				 *            A callback function to execute once the
				 *            file is loaded
				 */
				loadFile: function (path, onContentLoaded) {
					// Create the request object
					var xmlHttp = new XMLHttpRequest();
					if (xmlHttp != null) {
						this._currentPath = path;
						this._contentLoaded = false;
						// Open synchronous connection...
						xmlHttp.open("GET", path, false);
						// ...scope change ahead...
						var getter = this;
						xmlHttp.onreadystatechange = function () {
							// ... on success...
							if (xmlHttp.readyState == 4) {
								// ...update state variables...
								getter._currentTextResult = xmlHttp.responseText;
								getter._currentXMLResult = xmlHttp.responseXML;
								getter._contentLoaded = true;
								// ... and execute callback if any
								if (onContentLoaded)
									onContentLoaded.call(self, getter);
							}
						};
						// Afterwards close the connection
						xmlHttp.send(null);
					} else {
						// ...or not
						this._contentLoaded = false;
					}
				},

				/**
				 * Useful for timed/intervalled (non-callback) content
				 * check
				 */
				hasContent: function () {
					return this._contentLoaded;
				},

				/**
				 * Get the result in the right format
				 */
				getXML: function () {
					return this._currentXMLResult;
				},

				getText: function () {
					return this._currentTextResult;
				}
			};

			/**
			 * Contains the layout selection ui element
			 * @type {Documa.ui.layout.strategy.LayoutSelectionView}
			 */
			this._selectionUI = null;
			/**
			 * Indicates whether a layout selection dialog is currently
			 * already shown
			 */
			this._selectionShowing = false;
			this._runtimeAdaption = null;

			/**
			 * Provides a facade for getting layout-relevant context
			 * data.
			 *
			 * @type {Documa.ui.layout.strategy.LayoutContext}
			 */
			this._context = null;

			/**
			 * Transforms strategy models into executable code
			 */
			this._interpreter = null;
			this._currentStrategy = null;

			/**
			 * Loaded and interpreted layout strategies.
			 *
			 * @type {Array.<Documa.ui.layout.strategy.LayoutStrategy>}
			 */
			this._loadedStrategies = new Array();

			/**
			 * Array of layout context states previously active.
			 * @type {Array.<Documa.ui.layout.strategy.LayoutContextState>}
			 * @private
			 */
			this._selectionStates = new Array();
			this._selectionContext = null;
			this._interpreter = new Documa.ui.layout.strategy.LayoutInterpreter();
			this._localPreferences = new Documa.ui.layout.strategy.LocalPreferences();
			this._viewStack = createViewStack.call(this);

			// fallback component panel to view stack
			this._viewStack.add(createFallbackComponentPanel(this._fallbackView));
			this._uiManager = uiManager;

			// indicates whether the initial layout structure is
			// already set or not
			this._initialized = false;

			// variable references view that is currently
			// active.
			this._activeView = this._initView = this._fallbackView;

			// list of all available views.
			this._views = [];

			// Initial layout descriptor object, set during the
			// initialization.
			this._initLayout = this._fallbackView.getLayout();

			// list of all component instance ids
			this._instids = [];
		},
		/**
		 * Returns current layout context.
		 * @returns {Documa.ui.layout.strategy.LayoutContext}
		 */
		getLayoutContext: function () {
			return this._context;
		},
		/**
		 * Called after all layout strategies were loaded successfully.
		 *
		 * @param {Object} ajaxGetter
		 */
		onStrategyLoaded: function (ajaxGetter) {
			try {
				var self = this;
				var xmlModel = ajaxGetter.getXML();
				this._loadedStrategies.push(this._interpreter.interpretStrategy(xmlModel));
				if (this._loadedStrategies.length == _strategyPaths.length) {
					// fire all strategies loaded event
					self.onAllStrategiesLoaded();
				}
			} catch (error) {
				if (error.stack)
					_log.error(TAG, error.stack);
				else
					_log.error(TAG, error);
			}
		},

		/**
		 * Initializes layout selection ui elements.
		 */
		initializeLayoutSelectionElements: function () {
			_log.debug(TAG, "... initializing layout selection elements!");
			try {
				var self = this;
				// getting component container
				var container = Ext.getCmp(this._fallbackView.getName());
				// creating layout context with component viewport element to
				// get width and height from
				this._context = new Documa.ui.layout.strategy.LayoutContext(container);
				// create new layoutcontext state
				this._selectionStates.push(new Documa.ui.layout.strategy.LayoutContextState(
					this._context.getViewportWidth(),
					this._context.getViewportHeight()
				));
				// define resize handler for layout manager
				this._viewStack.on("resize", function (evt) {
					self.onViewportResize();
				});
				// create strategy selection ui container
				this._selectionUI = new Documa.ui.layout.strategy.LayoutSelectionView(this._selectionStates);
				let selectionDialog = this._selectionUI.getCurrentSelectionDialog();
				if (!selectionDialog) {
					throw new Error("Could not determine selection dialog!");
				}
				// current selection dialog to left stage
				this._uiManager.addToLeftStage(selectionDialog.getPanel());
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},

		/**
		 * Called after every layout strategy was loaded.
		 */
		onAllStrategiesLoaded: function () {
			_log.debug(TAG, "... all layout strategies were loaded!");
			// nothing to do here
		},
		/**
		 * Loads locally available strategies. This method is executed after the UI was rendered.
		 */
		loadStrategyModels: function () {
			try {
				var self = this;
				// Load strategy models
				for (var i = 0; i < _strategyPaths.length; i++) {
					var currentPath = _strategyPaths[i];
					self._strategyLoader.loadFile(currentPath, self.onStrategyLoaded);
				}
			} catch (error) {
				if (error.stack)
					_log.error(TAG, error.stack);
				else
					_log.error(TAG, error);
			}
		},
		/**
		 * Applies layout strategy with given id.
		 *
		 * @param {String} id layout strategy
		 */
		applyStrategy: function (id) {
			try {
				for (var i = 0; i < this._loadedStrategies.length; i++) {
					if (this._loadedStrategies[i].id == id)
						this._loadedStrategies[i].algorithm.apply();
				}
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},

		/**
		 * Applies the algorithm of the current context's
		 * selected strategy
		 */
		applyCurrentStrategy: function () {
			try {
				var currentPref = this._localPreferences.getPreference(this._context.getContextState());
				if (!currentPref) {
					_log.warn(TAG, "... could not determine layout context preference!");
					return;
				}

				this._currentStrategy = currentPref.strategyId;
				_log.debug(TAG, "... applying current strategy ...");
				this.applyStrategy(this._currentStrategy);
				_log.debug(TAG, "... finished!");
			} catch (error) {
				if (error.stack)
					_log.error(TAG, error.stack);
				else
					_log.error(TAG, error);
			}
		},
		/**
		 * Sorting strategies
		 */
		sortStrategies: function () {
			this._loadedStrategies.sort(function (a, b) {
				if (a.getRatingValue() > b.getRatingValue())
					return -1;
				if (a.getRatingValue() === b.getRatingValue())
					return 0;
				if (a.getRatingValue() < b.getRatingValue())
					return 1;
			});
		},
		/**
		 * Updates and renders the layout selection dialog.
		 *
		 * @param {Function} selectedCb callback executed after the user has selected a layout config option
		 */
		showSelectionUI: function (selectedCb) {
			try {
				let self = this;
				let applicableStrategies = this.getApplicableLayoutStrategies();
				if (applicableStrategies.length === 0) {
					_log.warn(TAG, "... no layout strategy applicable");
					selectedCb(null);
					return;
				}

				// define resize handler for layout manager
				this._viewStack.on("resize", function (evt) {
					self.onViewportResize();
				});

				//this._uiManager.slideLeftStageOut();
				// show toolbar and layout option elements
				this._selectionUI.show(selectedCb);
				this._uiManager.doLayout();
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},

		/**
		 * Hides the layout selection dialog
		 */
		hideSelectionUI: function () {
			if (this._selectionShowing) {

				this._selectionUI.hide();

				for (var k = 0; k < this._context.getAllCount(); k++) {
					this._context.getUIContainers()[k]._containerPanel.show();
				}

				this._selectionShowing = false;
			}
		},

		/**
		 * Returns layout strategy selection ui container.
		 * @returns {Documa.ui.layout.strategy.LayoutSelectionView}
		 */
		getSelectionUI: function () {
			return this._selectionUI;
		},

		/**
		 * Returns layout strategy that is referenced by given id.
		 *
		 * @param {String} strategyId
		 * @returns {Documa.ui.layout.strategy.LayoutStrategy}
		 */
		getStrategyById: function (strategyId) {
			for (var i = 0; i < this._loadedStrategies.length; i++) {
				if (this._loadedStrategies[i].id == strategyId)
					return this._loadedStrategies[i];
			}
		},

		/**
		 * Returns array of each successfully loaded strategy.
		 *
		 * @returns {Array.<Documa.ui.layout.strategy.LayoutStrategy>}
		 */
		getLoadedStrategies: function () {
			return this._loadedStrategies;
		},

		/**
		 * Executed on resize of the viewport.
		 */
		onViewportResize: function () {
			try {
				if (this._context.getAllCount() === 0) {
					// nothing to layout here
					return;
				}
				// reevaluate currtenly selected layout strategy
				evaluateAndApplyLayoutStrategy.call(this);
			} catch (error) {
				_log.error(error.stack);
			}
		},

		/**
		 * Called after a new component were added.
		 *
		 * @param {Documa.components.ComponentContainer} container
		 *                                                  added component container
		 */
		onComponentAdded: function (container) {
			_log.debug(TAG, "... component added: " + container.getComponentInstanceID());
			try {
				// reevaluate currtenly selected layout strategy
				evaluateAndApplyLayoutStrategy.call(this);
			} catch (error) {
				_log.error(error.stack);
			}
		},
		/**
		 * Called after a component were removed from local composition.
		 *
		 * @param {String} instid component's instance id
		 */
		onComponentRemoved: function (instid) {
			_log.debug(TAG, "... component removed: " + instid);
			try {
				// reevaluate currtenly selected layout strategy
				evaluateAndApplyLayoutStrategy.call(this);
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 * Saves selected layout strategy as local preference.
		 *
		 * @param {Documa.ui.layout.strategy.LayoutContextState} state
		 * @param {Documa.ui.layout.strategy.LayoutStrategy} strategy
		 */
		saveSelections: function (state, strategy) {
			this._selectionContext = state;
			this._localPreferences.updatePreference(state, strategy.id);
			this.hideSelectionUI();
			this.applyCurrentStrategy();
		},
		/**
		 *
		 * helper method that determines a free position for a
		 * component with given height and width
		 *
		 * @param {String} instid
		 * @param {Number} width
		 * @param {Number} height
		 * @returns {Object.<number, number, Object.<number, number>, string, string, Object.<number, number>>}
		 * */
		getAvailableComponentPosition: function (instid, width, height) {
			// TODO check implemented logic here
			var curLayout = this._activeView.getLayout();
			if (curLayout == undefined || curLayout == null || curLayout instanceof Documa.ui.layout.ListLayout) {
				return {
					x: 1,
					y: 1,
					bounds: {
						width: width,
						height: height
					},
					component: instid,
					unit: "pixel",
					layout: null,
					origin: {
						y: 1,
						x: 1
					}
				};
			} else {
				var positions = curLayout.getPositions();
				var shift = 0;
				for (var i = 0; i < positions.length; i++) {
					var posWidth = positions[i]._width;
					shift = shift + posWidth;
				}
				return {
					x: shift,
					y: 1,
					bounds: {
						width: width,
						height: height
					},
					component: instid,
					unit: "pixel",
					layout: null,
					origin: {
						y: 1,
						x: shift
					}
				};
			}
		},

		/**
		 * Returns array of currently applicable layout strategies.
		 *
		 * @returns {Array.<Documa.ui.layout.strategy.LayoutStrategy>}
		 */
		getApplicableLayoutStrategies: function () {
			var result = [];
			for (var i = 0; i < this._loadedStrategies.length; ++i) {
				if (this._loadedStrategies[i].isApplicable()) {
					result.push(this._loadedStrategies[i]);
				}
			}
			return result;
		},

		/**
		 * method allows to dynamically add and layout a
		 * component to either an empty canvas or an existing
		 * application
		 */
		dynmicallyAddComponents: function (instids) {
			// first check whether the layout manager was
			// already initialized
			if (this._initialized == true) {
				// TODO check added logic about adding
				// components when the layout was already
				// initialized
				for (var ind = 0; ind < instids.length; ++ind) {
					var position = this.getAvailableComponentPosition(instids[ind], 500, 400);
					this._activeView.getLayout().addPosition(position);
				}
			} else {
				// first initialize layout manager with a
				// default absolut layout
				// 1) generate default data structure / get next
				// free position
				var positions = new Array();
				for (var ind = 0; ind < instids.length; ++ind) {
					positions.push(this.getAvailableComponentPosition(instids[ind], 500, 400));
				}

				var defaultLayout = {
					agile: false,
					bounds: {
						height: 400,
						width: 500
					},
					name: "defaultLayout",
					positions: positions,
					style: new Array()
				};

				// 2) generate empty layout structure
				var layoutObj = new Documa.ui.layout.AbsoluteLayout(defaultLayout);

				var views = new Array();
				views.push(new Documa.ui.layout.View("StartView", layoutObj));

				this.initialize("StartView", views);
			}
		},

		/**
		 * Adding component container into main viewport.
		 *
		 * @param {Documa.components.ComponentContainer} container
		 */
		add: function (container) {
			_log.debug(TAG, "... adding component {" + container.getComponentID() + "} with id {" + container.getComponentInstanceID() + "}");

			// adding instance ids to layout manager
			this._instids.push(container.getComponentInstanceID());

			// get corresponding view panel from the viewport
			var currentPanel = this._uiManager.getChildPanel(this._activeView.getName());
			if (!currentPanel) {
				throw new Error("Can not determine view panel {" + this._activeView.getName() + "} during the add of component container: " + container.getComponentInstanceID());
			}

			currentPanel.add(container.getContainerPanel());
			currentPanel.doLayout();

			// update layout
			this._uiManager.doLayout();
		},
		/**
		 * Removes component container from layout.
		 * @param {Documa.components.ComponentContainer} container
		 */
		remove: function (container) {
			// remove id from container
			var idx = this._instids.indexOf(container.getComponentInstanceID());
			if (idx < 0) {
				throw new Error("Could not remove container {" + container.getComponentInstanceID() + "}, because it was not added!");
			}
			// remove container id
			this._instids.splice(idx, 1);

			// TODO: determine view of container

			/** @type Ext.Panel */
			var currentPanel = this._uiManager.getChildPanel(this._activeView.getName());
			if (!currentPanel) {
				throw new Error("Can not determine view panel {" + this._activeView.getName() + "} during the add of component container: " + container.getComponentInstanceID());
			}
			currentPanel.remove(container.getContainerPanel());
			currentPanel.doLayout();

			this._uiManager.doLayout();
		},
		/**
		 * Initialize the LayoutManager to transition into the
		 * initial layout state. Therefore, it needs the name of
		 * the initial view element and all possible view
		 * elements with its related layout description object.
		 *
		 * @param {String} initviewName
		 *              name of the initial view
		 * @param {Array} views
		 *              array of possible view and related
		 *              layouts
		 */
		initialize: function (initviewName, views) {
			// initialization logic
			// 1st: determine layout of initial view
			// 2nd: execute layout of initial view

			if (!initviewName instanceof String)
				throw new Error("Invalid initial view name argument.");

			if (!views instanceof Array)
				throw new Error("Invalid views array defined.");

			_log.debug(TAG, "... name of initial view {" + initviewName + "}");
			_log.debug(TAG, "... count of views {" + views.length + "}");
			this._views = views;

			for (var i = 0; i < views.length; ++i) {
				var view = this._views[i];

				if (!view instanceof Documa.ui.layout.View)
					throw new Error("Invalid view object found.");

				if (view.getName() === initviewName) {
					// found initial view - get layout object
					this._initLayout = view.getLayout();

					// set internal state variables
					this._initView = view;
					_log.debug(TAG, "... name of initial layout {" + this._initLayout.getName() + "}");
					break;
				}
			}

			if (!this._initView)
				throw new Error("Could not determine initial view and layout.");

			// indicate initialized state
			this._initialized = true;

			// activate initial view and layout
			_log.debug(TAG, "... start layout initialization.");
			this.layout(this._initView);

			var containers = Documa.RuntimeManager.getComponentManager().getContainers();
			if (!containers || containers.length == 0) {
				// layout initialization is executed before any
				// component container was created
				throw new Error("Not implemented yet!");
			} else {
				// layout initialization is executed after the
				// component resources were added and
				// containers were created
				if (this._instids.length == containers.length) {
					// all containers were already added into
					// the component panel

					// move all added containers from fallback
					// panel into current view panel
					var fallbackPanel = this._viewStack.findById(this._fallbackView.getName());
					var items = new Array();
					fallbackPanel.items.each(function (item, index) {
						// copy items because of following
						// modifying iteration
						items.push(fallbackPanel.items.get(index));
					});
					var activePanel = this._viewStack.findById(this._activeView.getName());
					Ext.each(items, function (item, index) {
						fallbackPanel.remove(item, false);
						activePanel.add(item);
					});
					this._viewStack.remove(fallbackPanel);
					activePanel.doLayout();
				}
			}
			this._uiManager.doLayout();

			// notify event handler
			this.onInitialized(this._initView);
			_log.debug(TAG, "... finished layout initialization");
			Documa.RuntimeManager.getComponentManager().onLayoutInitialized();
		},

		/**
		 * This function layouts the specified component view
		 * container according to the layout configuration
		 * received from the server.
		 *
		 * @param {Documa.ui.layout.View} view object defining its related layout
		 *            that should be currently active active
		 */
		layout: function (view) {
			_log.debug(TAG, "... activating layout {" + view.getLayout().getName() + "}");
			if (view === this._activeView) {
				_log.warn(TAG, "... you try to activate an already activated view.");
				return;
			}

			if (view.getLayout() instanceof Documa.ui.layout.AbsoluteLayout) {
				// add a new panel that should contain several
				// mashup components

				// no need to get stack from uimanager because
				// we added the stack during the
				// construction of
				// this class and we have a reference to the
				// stack
				this._viewStack.add({
					xtype: 'panel',
					id: view.getName(),
					layout: 'absolute',
					showHeader: false,
					border: false,
					autoScroll: true,
					bufferResize: true,
					flex: 0,
					// don't react to any resizing modifications
					resizeEvent: null
				});

				// set add panel as active item on component
				// panel stack
				//this._viewStack.getLayout().setActiveItem(view.getName());

				// update layout after a new component panel was
				// added
				this._uiManager.doLayout();
			} else {
				throw new Error("Not supported layout type found!");
			}
			// notify handler
			this.onViewChanged(this._activeView, view);
			// update active view
			this._activeView = view;
		},

		/**
		 * Renders the already initialized components from the
		 * current view correctly
		 */
		layoutComponents: function () {
			if (!this._activeView instanceof Documa.ui.layout.View)
				throw new Error("No valid view defined.");

			// get corresponding view panel from the viewport
			var viewPortPanel = this._viewStack.findById(this._activeView.getName());
			var currentLayout = this._activeView.getLayout();
			// get component manager
			var coman = Documa.RuntimeManager.getComponentManager();
			if (!currentLayout)
				throw new Error("No layout element defined!");

			if (currentLayout instanceof Documa.ui.layout.CoslamBasis) {
				viewPortPanel.doLayout();
				// Show selection ui
				//this.showSelectionUI();
			} else if (currentLayout instanceof Documa.ui.layout.AbsoluteLayout) {
				// create a wrapper panel for each component in the current layout
				var positions = currentLayout.getPositions();
				var bounds = currentLayout.getBounds();

				if (bounds && bounds.width && bounds.height) {
					// set layout container dimensions
					viewPortPanel.setWidth(bounds.width);
					viewPortPanel.setHeight(bounds.height);
				}

				for (var i = 0; i < positions.length; i++) {
					var layoutElem = positions[i];

					// get component container and replace width and height
					var container = coman.getContainerElementById(layoutElem.getComponentInstanceId());
					var containerPanel = container.getContainerPanel();

					if (containerPanel === undefined || containerPanel === null) {
						throw new Error('No Panel for component ' + container.getComponentID() + ' found');
					}

					if (container.isUI()) {
						// set title of container panel
						containerPanel.setTitle(container.getComponentInstance().getProperty('title'));
						// setting position of container panel
						containerPanel.setPosition(layoutElem.getOrigin().x, layoutElem.getOrigin().y);
						// setting dimensions of container panel
						containerPanel.setSize(layoutElem.getSize().width, layoutElem.getSize().height);
					} else {
						containerPanel.hide();
					}
				}
			} else {
				throw new Error("Other layouts are not supported yet!");
			}

			// update and show component panel
			this._viewStack.doLayout();

			// show all components
			Documa.RuntimeManager.getComponentManager().onLayoutCompleted();
			// initially show window with all collaboration
			// partners
			Documa.RuntimeManager.getAwarenessManager().initialize();
		},

		/**
		 * Create a new layout position element to render a new
		 * component dynamically without predefined layout model
		 * (to support an empty payload of layout command - a
		 * case of loading a shared application and dynamic
		 * sharing)
		 *
		 * @param {String} instid component instance id
		 */
		addComponentLayoutElement: function (instid) {
			// check current type of layout
			if (this._activeView.getLayout() instanceof Documa.ui.layout.AbsoluteLayout) {
				var positions = this._activeView.getLayout().getPositions();
				var position = null;

				if (positions.length == 0) {
					position = {
						bounds: {
							height: 400,
							width: 500
						},
						unit: "pixel",
						component: instid,
						layout: null,
						origin: {
							y: 1,
							x: 1
						}
					};
					// add new position to current view
					this._activeView.getLayout().addPosition(position);
				} else {
					var shift = 0;
					for (var i = 0; i < positions.length; i++) {
						var posWidth = positions[i]._width;
						shift = shift + posWidth;
					}

					position = {
						bounds: {
							height: 400,
							width: 500
						},
						unit: "pixel",
						component: instid,
						layout: null,
						origin: {
							y: 1,
							x: shift
						}
					};
					// add new position to current view
					this._activeView.getLayout().addPosition(position);
				}
			} else {
				throw new Error("Other layouts than AbsoluteLayout are supported yet!");
			}
		},

		/**
		 * Returns layout element from currently active layout
		 * object t hat is related to the component with given
		 * instance id.
		 *
		 * @param {String} instid component instance id
		 */
		getComponentLayoutElement: function (instid) {
			if (!instid instanceof String)
				throw new Error("Invalid component instance id specified");

			if (!this._activeView instanceof Documa.ui.layout.View)
				throw new Error("No valid view defined.");

			var layout = this._activeView.getLayout();

			if (layout instanceof Documa.ui.layout.AbsoluteLayout) {
				// handling current absolute layout definition
				for (var i = 0; i < layout.getPositions().length; ++i) {
					var layoutElement = layout.getPositions()[i];

					// check layouts validity
					if (!layoutElement instanceof Documa.ui.layout.Position)
						throw new Error("Invalid absolute layout element found!");

					// get the related layout element from
					// instance id
					if (instid === layoutElement.getComponentInstanceId()) {
						return layoutElement;
					}
				}
			} else {
				throw new Error("Not supported layout element found!");
			}
		},

		/**
		 * Handler is called after the initial view was
		 * activated.
		 *
		 * @param {Documa.ui.layout.View} view initial view
		 */
		onInitialized: function (view) {
			// // get corresponding view panel from the viewport
			// var viewPortPanel =
			// _viewPort.findById(view.getName());
			// // create a wrapper panel for each component in
			// the current layout
			// var positions = view.getLayout().getPositions();
			// for ( var i = 0; i < positions.length; i++) {
			// var currentComponent = positions[i];
			// viewPortPanel.add(new Ext.Panel({
			// layout: 'fit',
			// showHeader: true,
			// border: true,
			// id:currentComponent._instid,
			// title: currentComponent._instid,
			// width: currentComponent._width,
			// height: currentComponent._height,
			// x: currentComponent._x,
			// y: currentComponent._y
			// }));
			// }
		},

		/**
		 * Handler is called after the new view was activated
		 * and replaces the specified old view. The view is only
		 * changed if the new is not the same as the current
		 * view.
		 *
		 * @param {Object} oldView previous view object
		 * @param {Object} newView newly activated view object
		 */
		onViewChanged: function (oldView, newView) {
			// TODO: implement additional completion logic here
		},

		/**
		 * Function to check whether the Layout hierarchy was
		 * already initialized or not
		 *
		 * @returns {boolean}
		 */
		isLayoutInitialized: function () {
			return (this._initialized === true);
		},

		/**
		 * Returns current active view.
		 *
		 * @returns {Documa.ui.layout.View}
		 */
		getCurrentView: function () {
			console.warn(this._activeView);
			return this._activeView;
		},

		/**
		 * Returns current component view panel.
		 *
		 * @returns {Ext.Panel}
		 */
		getCurrentViewPanel: function () {
			// get corresponding view panel from the viewport
			/** @type Ext.Panel */
			var currentViewPanel = this._uiManager.getChildPanel(this._activeView.getName());
			return currentViewPanel;
		},

		/**
		 * Returns list of available view objects.
		 *
		 * @returns {Array}
		 */
		getViews: function () {
			return this._views;
		},

		/**
		 * Returns the initial view.
		 *
		 * @return {Documa.ui.layout.View}
		 */
		getInitialView: function () {
			return this._initView;
		},

		/**
		 * Returns stack of view panels. Each view can contain
		 * several mashup components.
		 *
		 * @return {Ext.Panel}
		 */
		getViewStack: function () {
			return this._viewStack;
		},
		/**
		 * Returns margin value of each component instance in pixel distance.
		 *
		 * @returns {number}
		 */
		getComponentMargin: function () {
			return CSR_CMP_MARGIN;
		},
		/**
		 * Returns internal component padding border between iframe and component panel element in pixel.
		 * @returns {number}
		 */
		getComponentPadding: function () {
			return CSR_CMP_PADDING;
		},
		/**
		 * Returns border size of component container panel.
		 * @returns {number}
		 */
		getComponentBorderSize: function () {
			return CSR_CMP_BORDER;
		},
		/**
		 * Returns internal component panel header padding  in pixel.
		 * @returns {number}
		 */
		getComponentHeaderPadding: function () {
			return CSR_CMP_HEADER_PADDING;
		},

		/**
		 * Returns internal component panel header margin in pixel.
		 * @returns {number}
		 */
		getComponentHeaderMargin: function () {
			return CSR_CMP_HEADER_MARGIN;
		},

		/**
		 * Returns standard value for scrollbar width/height in pixel.
		 * @returns {number}
		 */
		getScrollbarSize: function () {
			return CSR_CMP_SCROLLBAR_SIZE;
		},

		/**
		 * Returns true if given panel has an active horizontal scrollbar, else false.
		 *
		 * @param {Ext.Panel} panel
		 * @returns {boolean}
		 */
		hasHorizontalScrollbar: function (panel) {
			return (panel.getInnerWidth() > panel.getFrameWidth());
		},

		/**
		 * Returns true if given panel has an active horizontal scrollbar, else false.
		 *
		 * @param {Ext.Panel} panel
		 * @returns {boolean}
		 */
		hasVerticalScrollbar: function (panel) {
			return (panel.getInnerHeight() > panel.getFrameHeight());
		}
	};
})());
