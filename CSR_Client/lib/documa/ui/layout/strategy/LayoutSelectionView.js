Ext.namespace('Documa.ui.layout.strategy');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.layout.strategy.SelectionDialog');

Documa.ui.layout.strategy.LayoutSelectionView = Ext.extend(Object, (function() {
	var TAG = "Documa.ui.layout.strategy.LayoutSelectionView";
	var _log = Documa.util.Logger;
	
	/**
	 * Returns selection dialog containing state specific set of strategy ui elements.
	 * @param {Documa.ui.layout.strategy.LayoutContextState} layoutState
	 * @returns {Documa.ui.layout.strategy.SelectionDialog | null}
	 */
	function getSelectionDialogFrom(layoutState) {
		for(let i = 0; i < this._layoutStrategyDialogs.length; ++i) {
			let dialog = this._layoutStrategyDialogs[i];
			if(dialog.getContextState().viewportHeight === layoutState.viewportHeight &&
				dialog.getContextState().viewportWidth === layoutState.viewportWidth) {
				return dialog;
			}
		}
		return null;
	}
	
	return {
		/**
		 * Ctor.
		 * @constructs.
		 *
		 * @param {Array.<Documa.ui.layout.strategy.LayoutContextState>} layoutStates
		 */
		constructor: function(layoutStates) {
			_log.debug(TAG, "... initializing Selection UI");
			var lm = Documa.RuntimeManager.getUIManager().getLayoutManager();
			var self = this;
			
			this._states = layoutStates;
			
			/**
			 * handler function to be called after a layout strategy element was selected
			 * @type {Function}
			 * @private
			 */
			this._layoutActivatedHandler = null;
			
			/**
			 * Id of selected layout strategy.
			 * @type {Documa.ui.layout.strategy.LayoutStrategy}
			 * @private
			 */
			this._selectedStrategy = null;
			
			/**
			 * array of strategy ui elements
			 * @type {Array.<Documa.ui.layout.strategy.SelectionDialog>}
			 * @private
			 */
			this._layoutStrategyDialogs = [];
			_log.debug(TAG, "... creating head bar");
			
			// creating tool bar for selecting layout options
			this._toolbar = new Ext.Toolbar({
				id: "layoutSelectionToolbar",
				title: "Please select your layouts!",
				hidden: true,
				layout: {
					type: 'vbox',
					align: 'stretch'
				}
			});
			
			try {
				// add for each strategy object a representig option on UI layer
				for(var i = 0; i < this._states.length; ++i) {
					var dialog = new Documa.ui.layout.strategy.SelectionDialog(this._states[i]);
					
					// add dialog element to array of dialogs
					this._layoutStrategyDialogs.push(dialog);
					
					/**
					 * Adds listener to strategy selected event.
					 * @type {Documa.ui.layout.strategy.LayoutStrategy} strategy
					 */
					dialog.addListener(Documa.ui.layout.strategy.SelectionDialogEvents.SELECTED, function(strategy) {
						_log.debug(TAG, "... layout strategy: " + strategy.id + " selected!");
						self._selectedStrategy = strategy;
					});
					
					/**
					 * Adding listener to strategy activated event.
					 */
					dialog.addListener(Documa.ui.layout.strategy.SelectionDialogEvents.ACTIVATED,
						function(layoutState, strategy) { // start activating layout here
							// specified strategy in given layout context state activated
							_log.debug(TAG, "... activating layout strategy: " + strategy.id);
							// save selected layout strategy
							lm.saveSelections(layoutState, strategy);
							try {
								// call strategy activation handler
								self._layoutActivatedHandler(strategy);
							} catch (error) {
								_log.debug(TAG, error.stack);
							}
						});
				}
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		
		/**
		 * Returns selection panel toolbar.
		 * @returns {Ext.Toolbar}
		 */
		getToolbar: function() {
			return this._toolbar;
		},
		
		/**
		 * Returns list of layout context states.
		 * @returns {Array.<Documa.ui.layout.strategy.LayoutContextState>}
		 */
		getStates: function() {
			return this._states;
		},
		/**
		 * Returns available layout selection dialogs.
		 * @returns {Array.<Documa.ui.layout.strategy.SelectionDialog>}
		 */
		getDialogs: function() {
			return this._layoutStrategyDialogs;
		},
		
		/**
		 * Returns currently valid layout strategy selection dialog.
		 *
		 * @returns {Documa.ui.layout.strategy.SelectionDialog|null}
		 */
		getCurrentSelectionDialog: function() {
			// get layout manager
			let layoutManager = Documa.RuntimeManager.getUIManager().getLayoutManager();
			// current valid layout state
			let contextState = layoutManager.getLayoutContext().getContextState();
			// getting corresponding selection from current layout state
			return getSelectionDialogFrom.call(this, contextState);
		},
		
		/**
		 * Shows toolbar and each layout selection dialog.
		 *
		 * @param {Function} activatedCallback
		 */
		show: function(activatedCallback) {
			try {
				this._layoutActivatedHandler = activatedCallback;
				// getting currently valid strategy selection dialog
				let dialog = this.getCurrentSelectionDialog();
				if(!dialog) {
					throw new Error("Could not determine layout strategy selection element!");
				}
				// fill up dialog with strategy ui elements
				dialog.fillup();
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		
		/**
		 * Hides toolbar and each layout selection dialog.
		 */
		hide: function() {
			this._toolbar.hide();
		},
		
		/**
		 * Returns id of selected layout strategy.
		 * @returns {Documa.ui.layout.strategy.LayoutStrategy}
		 */
		getSelectedLayoutStrategy: function() {
			return this._selectedStrategy;
		}
	};
})());