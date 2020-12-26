Ext.namespace('Documa.ui.layout.strategy');

Documa.require('Documa.util.Logger');

Documa.ui.layout.strategy.SelectionDialogEvents = {
	SELECTED: "selected",
	ACTIVATED: "activated"
};

Documa.ui.layout.strategy.SelectionDialog = Ext.extend(Ext.util.Observable, (function () {
	var TAG = "Documa.ui.layout.strategy.SelectionDialog";
	var _log = Documa.util.Logger;
	var _count = 0;

	/**
	 * Helper method to create layout strategy ui element
	 * @param {Documa.ui.layout.strategy.LayoutStrategy} strategy
	 * @returns {Node}
	 */
	function createStrategyUIElement(strategy) {
		// create strategy thumb element
		var currentDiv = document.createElement('div');
		currentDiv.style.display = "inline-block";
		currentDiv.style.margin = "10px";
		currentDiv.style.padding = "10px";
		currentDiv.style.borderRadius = "5px";
		currentDiv.style.backgroundColor = "#ffffff";

		// define icon
		var icon = document.createElement('img');
		icon.width = 100;
		icon.height = 100;
		icon.src = strategy.iconUrl;

		var titleP = document.createElement('p');
		titleP.innerHTML = strategy.name + "<br />Eignung: " + strategy.getRatingValue() + " %";

		// add icon and title into thumb element
		currentDiv.appendChild(icon);
		currentDiv.appendChild(titleP);

		var self = this;
		currentDiv.onclick = function (event) {
			var lm = Documa.RuntimeManager.getUIManager().getLayoutManager();
			currentDiv.style.backgroundColor = "#aaaaaa";

			// fire selected event and handover strategy object
			self.fireEvent(Documa.ui.layout.strategy.SelectionDialogEvents.SELECTED, strategy);
		};
		return currentDiv;
	}

	/**
	 * Helper method to create layout strategy ui element.
	 *
	 * @param {Documa.ui.layout.strategy.LayoutStrategy} strategy
	 * @returns {Ext.Container}
	 */
	function createStrategyUIElement2(strategy) {
		// create strategy thumb element
		var data = {strategies: [strategy]};
		var store = new Ext.data.JsonStore({
			//autoDestroy: true,
			root: 'strategies',
			idProperty: 'id',
			fields: [
				{name: 'id', type: 'string'},
				{name: 'name', type: 'string'},
				{name: 'icon', type: 'string', mapping: 'iconUrl'},
				{name: 'rating', type: 'float', convert: function (v, record) {
					return record.getRatingValue();
				}}
			]
		});
		store.loadData(data);

		var tpl = new Ext.XTemplate(
			'<tpl for=".">',
			'<div class="csr-ls-wrap" id="{id}">',
			'<img class="csr-ls-icon" src="{icon}">',
			'<p>{name}<br/>Eignung:&nbsp;{rating}&nbsp;%</p>',
			'</div>',
			'</tpl>',
			'<div class="x-clear"></div>'
		);
		var self = this;
		return new Ext.Panel({
			id: "csr-" + strategy.id,
			frame: false,
			border: false,
			margins: '10',
			padding: '5',
			items: new Ext.DataView({
				store: store,
				autoHeight: true,
				multiSelect: false,
				singleSelect: true,
				overClass: 'x-view-over',
				itemSelector: 'div.csr-ls-wrap',
				tpl: tpl,
				listeners : {
					selectionchange : function (dataview, selections){
						var selected = dataview.getSelectedRecords()[0];
						if(selected.data.id !== strategy.id){
							throw new Error("Invalid strategy selected!");
						}
						self._selectedStrategy = strategy;
						self.fireEvent(Documa.ui.layout.strategy.SelectionDialogEvents.SELECTED, strategy);
					}
				}
			})
		});
	}

	return {
		/**
		 * Ctor.
		 * @constructor.
		 *
		 * @param {Documa.ui.layout.strategy.LayoutContextState} contextState
		 */
		constructor: function (contextState) {
			Documa.ui.layout.strategy.SelectionDialog.superclass.constructor.call(this);

			// adding fireable events
			this.addEvents(Documa.ui.layout.strategy.SelectionDialogEvents.SELECTED,
				Documa.ui.layout.strategy.SelectionDialogEvents.ACTIVATED);

			_log.debug(TAG, "... initializing selection dialog ...");
			var lm = Documa.RuntimeManager.getUIManager().getLayoutManager();
			this._contextState = contextState;
			this._selectedStrategy = null;

			var self = this;
			_log.debug(TAG, "... context state: " + this._contextState.viewportWidth + " " + this._contextState.viewportHeight);

			this._items = new Ext.Panel({
				id: "csr-strategy-container" + _count,
				cls : "csr-strategy-container",
				autoScroll: true,
				frame: false,
				border: false,
				flex: 1.0,
				layout: {
					type: 'vbox',
					align: 'center'
				}
			});

			// create selection dialog container panel
			this._panel = new Ext.Panel({
				title: "Layout Strategies!",
				id: "selectionDialog" + (_count++),
				frame: false,
				border: false,
				layout: {
					type: 'vbox',
					align: 'stretch'
				},
				items: [ this._items,
					{
						xtype: 'button',
						id: "startButtonLayout",
						text: "Go!",
						flex: 0,
						handler: function (button, clickEvt) {

							// fire activated event
							self.fireEvent(Documa.ui.layout.strategy.SelectionDialogEvents.ACTIVATED,
								self._contextState,
								self._selectedStrategy);
						}
					}
				]
			});
			//lm.getLayoutContext().setContextState(contextState);
			//lm.sortStrategies();
			this._strategyDivs = [];
		},

		fillup: function () {
			let lm = Documa.RuntimeManager.getUIManager().getLayoutManager();
			let applicableStrategies = lm.getApplicableLayoutStrategies();
			if(applicableStrategies.length === 0) {
				// there are no applicable layout strategies
				throw new Error("No applicable layout strategies available");
			} else {
				// applicable layout strategies available
				for(let i = 0; i < applicableStrategies.length; ++i) {
					let panel = createStrategyUIElement2.call(this, applicableStrategies[i]);
					this._strategyDivs.push(panel);
					this._items.add(panel);
					this._items.doLayout();
				}
				this._panel.doLayout();
			}
		},
		/**
		 * Returns panel containing strategy UI-elements.
		 * @returns {Ext.Panel}
		 */
		getPanel: function () {
			return this._panel;
		},

		/**
		 * Get state of layout context valid during the strategy selection time.
		 * @returns {Documa.ui.layout.strategy.LayoutContextState}
		 */
		getContextState: function () {
			return this._contextState;
		}
	};
})());