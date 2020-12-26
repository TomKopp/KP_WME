Ext.namespace('Documa.ui.homescreen');

Documa.require('Documa.util.Logger');
Documa.require('Documa.communication.commands.CommandFactory');
Documa.require('Documa.ui.homescreen.HomeScreenView');
Documa.require('Documa.context.ApplicationContext');

Documa.ui.homescreen.HomeScreenController = Ext.extend(Object, ( function () {
	/* private members */
	var TAG = 'Documa.ui.homescreen.HomeScreenController';
	var _log = Documa.util.Logger;

	/** @type Documa.ui.homescreen.HomeScreenView */
	var _homeScreenView = null;

	/* public members */
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function () {
			_homeScreenView = new Documa.ui.homescreen.HomeScreenView(this);
		},

		/**
		 * Loading predefined composition model.
		 * @param {Object} payload
		 */
		loadComposition: function (payload) {
			_log.debug(TAG, "... loading composition model of application {id: " + payload.id + ", name: " + payload.name + " version: " + payload.version + "}");

			// create application context object that encapsulates several application
			// lifecycle states
			Documa.RuntimeManager.setApplicationContext(new Documa.context.ApplicationContext(payload.id, payload.name, payload.version, undefined));

			// calling start on application context
			Documa.RuntimeManager.getApplicationContext().start();

			// hide Home Screen View if displayed
			//_homeScreenView.hideApps();
		},

		/**
		 * Start joining selected application.
		 *
		 * @param {Object} payload object representing the selected application
		 */
		joinApp: function (payload) {
			_log.debug(TAG, "... joining application {id: " + payload.id + ", name: " + payload.name + " version: " + payload.version + "}");

			// create application context object that encapsulates several application
			// lifecycle states
			Documa.RuntimeManager.setApplicationContext(new Documa.context.ApplicationContext(payload.id, payload.name, payload.version, payload.instid));

			// calling join on application context
			Documa.RuntimeManager.getApplicationContext().join();

			// hide homescreen
			//_homeScreenView.hideApps();
		},

		/**
		 * Add representation object of participating client to the homescreen.
		 *
		 * @param {Documa.context.user.Participator} participator client representing
		 * object
		 */
		/*addParticipant : function(participator) {
		 _homeScreenView.addClient(participator);
		 },*/

		/**
		 * Remove representation object of participating client from the homescreen.
		 *
		 * @param {Documa.context.user.Participator} participator client representing
		 * object
		 */
		/*removeParticipator : function(participator) {
		 _homeScreenView.removeClient(participator);
		 },*/

		/**
		 * Adds given container to center stage of the homescreen view.
		 *
		 * @param {Ext.Container} container
		 */
		add: function (container) {
			_homeScreenView.addContainer(container);
		},

		/**
		 * Adds application description object into list of available applications started by the current user.
		 *
		 * @param {Object} app
		 */
		addApplication: function (app) {
			try {
				_homeScreenView.loadApp(app);
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},

		/**
		 * Removes given container from center stage of the homescreen view.
		 *
		 * @param {Ext.Container} container
		 */
		remove: function (container) {
			_homeScreenView.removeContainer(container);
		},

		/**
		 * Returns child component from homescreen view from defined id.
		 *
		 * @param {String} id child id
		 */
		get: function (id) {
			return _homeScreenView.getComponent(id);
		},

		/**
		 * Present several applications.
		 *
		 * @param {Object} apps object containing list of available and joinable
		 * applications
		 */
		show: function (apps) {
			_homeScreenView.loadApps(apps);
		},

		/*
		 showDistributions : function() {
		 _homeScreenView.showDistributions();
		 },

		 appendDistribution : function(distview) {
		 _homeScreenView.appendDistributionView(distview);
		 },*/

		/**
		 * Shows error message within homescreen.
		 * @param {String} errormsg error message
		 */
		showError: function (errormsg) {
			_homeScreenView.showError(errormsg);
		},

		/**
		 * Updates the layout of the homescreen view.
		 */
		updateLayout: function () {
			_homeScreenView.doLayout();
		},

		/**
		 * Returns homescreen view.
		 *
		 * @return {Documa.ui.homescreen.HomescreenView}
		 */
		getView: function () {
			return _homeScreenView;
		}
	};
}()));
