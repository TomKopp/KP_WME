Ext.namespace('Documa.ui.mainmenu');

Documa.require('Documa.util.Logger');
Documa.require('Documa.RuntimeManager');
Documa.require('Documa.communication.commands.CommandFactory');

Documa.require('Documa.ui.mainmenu.SearchPanel');
Documa.require('Documa.ui.mainmenu.MenuView');
Documa.require('Documa.ui.mainmenu.Utils');
Documa.require('Documa.ui.UIManager');

/**
 * Object encapsulating the main menu API.
 * @class
 */
Documa.ui.mainmenu.MenuManager = Ext.extend(Object, (function(){
	const TAG = 'Documa.ui.mainmenu.MenuManager';
	const LOG = Documa.util.Logger;
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {Documa.ui.UIManager} uiManager
		 */
		constructor: function(uiManager){
			this._cfactory = new Documa.communication.commands.CommandFactory();
			this._communicationManager = Documa.RuntimeManager.getCommunicationManager();
			this._uiManager = uiManager;
			this._tb = new Documa.ui.mainmenu.MenuView(this);
			this._utils = Documa.ui.mainmenu.Utils;
			this._componentManager = Documa.RuntimeManager.getComponentManager();

			/**
			 * @type {Documa.ui.mainmenu.SearchResultView}
			 * @private
			 */
			this._searchResultView = new Documa.ui.mainmenu.SearchPanel(this);
		},

		/**
		 * Function to create payload for SearchCoRe command
		 *
		 * @param {string} query
		 * @param {boolean} isUi
		 * @param {number} maxComps
		 */
		doSearch: function(query, isUi, maxComps){
			var rt_type = Documa.RuntimeManager.getRuntimeContext().getRuntimeType();
			var rt_vs = Documa.RuntimeManager.getRuntimeContext().getRuntimeVersion();
			var searchCmd = this._cfactory.createSearchComponentsCommand(query, isUi, maxComps, rt_type, rt_vs);
			this._communicationManager.sendSystemLevelMessage(searchCmd);
		},

		/**
		 * @returns {Documa.ui.mainmenu.MenuView}
		 */
		getMenuView: function(){
			return this._tb;
		},


		/**
		 * Set search result view.
		 * @param {Documa.ui.mainmenu.SearchResultView} view
		 */
		setSearchResultView: function(view){
			this._searchResultView = view;
		},

		/**
		 * @returns {Documa.ui.mainmenu.SearchResultView}
		 */
		getSearchResultView: function(){
			return this._searchResultView;
		},

		setFocusOnSearchField: function(){
			this._tb.setFocusOnSearchField();
		},

		integrateCmp: function(recordId){
			this._componentManager.integrateCmp(recordId);
			this._searchResultView.hide();
		},

		changeView: function(view){
			if (Documa.RuntimeManager.getApplicationContext() != null) {
				this._uiManager.setAndShowActiveView(view);
			}
		},

		changeProfView: function(view){
			this._uiManager.showActiveProfSubView(view);
		},

		startNewApp: function(){
			var appContext = Documa.RuntimeManager.getApplicationContext();
			var payload = null;

			//Check if an existing app was open
			if (appContext != null) {
				Documa.RuntimeManager.setStartNewApp(true);
				var handler = function(btn){
					if (btn == "yes") {
						//If yes was clicked, first save the old app
						this.saveApplication(true);
					}
					else {
						//Else close the old app and start the new one
						appContext.close();
					}
				};
				Ext.MessageBox.confirm("Save app", "Save current application first?", handler, this);
			}
			else {
				this.sendStartAppCommand();
			}

		},

		sendStartAppCommand: function(){
			var name = "";
			var handler = function(btn, text){
				if (btn != "ok") return;

				var version = "0.1";
				var id = uuid.v4();
				var type = "available";
				Documa.RuntimeManager.setApplicationContext(new Documa.context.ApplicationContext(id, text, version, type));
				Documa.RuntimeManager.getApplicationContext().startNewComposition(null);
			};
			Documa.RuntimeManager.getUIManager().showPromptDialog("New Application",
				"Please enter the name of the new mashup application.", name, handler);
		},

		/**
		 * Save an application
		 * @param startNewApp True, if after saving the application it should be closed and a new app started
		 */
		saveApplication: function(startNewApp){
			var appContext = Documa.RuntimeManager.getApplicationContext();
			var payload = null;
			var appName;
			var appid;
			var appVersion;
			var appctime;
			if (appContext != null) {
				appName = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_NAME);
				appid = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
				appVersion = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
				appctime = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
			}

			//If the app should be saved under a new name
			var handler = function(btn, text){
				if (btn != "ok") return;

				var context = Documa.RuntimeManager.getApplicationContext();
				context.put(Documa.context.ApplicationContextAttributes.APP_NAME, text);

				//Create payload
				payload = {
					'id': appid,
					'version': appVersion,
					'instid': appctime,
					'name': text,
				};

				var saveAppCmd = this._cfactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL,
					Documa.communication.commands.SystemCommands.SAVEAPP, payload);
				this._communicationManager.sendSystemLevelMessage(saveAppCmd);

				if (startNewApp) {
					context.close();
				}
			};

			this._uiManager.showPromptDialog("Save your mashup application", "Please enter the name", appName,
				handler, this);
		},
	};
})()); 