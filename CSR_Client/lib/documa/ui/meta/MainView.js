Ext.namespace("Documa.ui.meta");

Documa.require("Documa.ui.meta.subview.StartView");
Documa.require("Documa.ui.meta.subview.DistributionView");
Documa.require("Documa.ui.meta.subview.LoadingView");
Documa.require("Documa.ui.meta.directives.DistributionDialog");

// TODO: add here the dependencies to other subviews

/**
 * @class
 */
Documa.ui.meta.MainView = Ext.extend(Object, function(){
	var TAG = "Documa.ui.meta.MainView";
	var _log = Documa.util.Logger;
	/////////////////////
	// private methods //
	/////////////////////

	// TODO: add here further private methods

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {$compile} compile
		 */
		constructor: function(compile){
			Documa.ui.meta.MainView.superclass.constructor.call(this);
			this._compile = compile;

			/**
			 * @type {Documa.ui.meta.subview.LoadingView}
			 * @private
			 */
			this._loadingView = null;

			/**
			 * @type {Documa.ui.meta.subview.StartView}
			 * @private
			 */
			this._startView = null;

			/**
			 * @type {Documa.ui.meta.subview.DistributionView}
			 * @private
			 */
			this._distributionView = null;

			/**
			 * @type {Documa.ui.meta.directives.DistributionDialog}
			 * @private
			 */
			this._compDistDialog = null;

			/**
			 * @type {}
			 * @private
			 */
			this._composeView = null;

			/**
			 * @type {Documa.ui.meta.MetaUIController}
			 * @private
			 */
			this._mainController = null;
		},
		/**
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		setup: function(scope, elem, attr){
			this._scope = scope;
			this._elem = elem;
			this._attr = attr;


			/**
			 * @type {Documa.ui.meta.subview.LoadingView}
			 * @private
			 */
			this._scope.loadView = null;

			/**
			 * @type {Documa.ui.meta.subview.StartView}
			 * @private
			 */
			this._scope.startView = null;

			/**
			 * @type {Documa.ui.meta.subview.DistributionView}
			 * @private
			 */
			this._scope.distView = null;

			/**
			 * @type {Documa.ui.meta.directives.DistributionDialog}
			 * @private
			 */
			this._scope.distributionDialog = null;

			/**
			 * @type {Documa.context.ApplicationContext}
			 * @private
			 */
			this._scope.currentApplication = null;

			/**
			 * @type {Object.<string, boolean>}
			 * @private
			 */
			this._checklist = {};
			this._checklist["startview"] = false;
			this._checklist["distview"] = false;
			//this._checklist["distdialog"] = false;
			this._checklist["loadview"] = false;


			// init the main navigation carousel
			this._carousel = this._elem.find(".carousel#csr-mui-main");
			this._carousel.carousel({interval: false}); // init navigation carousel without automatically navigating

			// definition of check state function
			var checkInitState = function(){
				/* && this._distributionView && this._composeView */
				var keys = Object.keys(this._checklist);
				if (keys.length == 0)
					return;
				for (var i = 0; i < keys.length; ++i){
					if (!this._checklist[keys[i]]) {
						// there is a missing checkmark
						return;
					}
				}
				// all checkmarks true
				this._scope.$emit(Documa.ui.meta.MetaUIEvents.MAIN_LOADED, this);
			};

			var self = this;
			this._scope.$watch("loadView", function(controller){
				if (!controller) return;
				self._loadingView = controller;
			});

			this._scope.$watch("startView", function(controller){
				if (!controller) return;
				self._startView = controller;
			});

			this._scope.$watch("distView", function(controller){
				if (!controller) return;
				self._distributionView = controller;
			});

			this._scope.$watch("distributionDialog", function(controller){
				if (!controller) return;
				self._compDistDialog = controller;
				self._checklist["distdialog"] = true;
				checkInitState.call(self);
			});

			///////////////////////////////////////////////////////////////////////////
			// TODO: extend init state checks here for distribution and compose view //
			///////////////////////////////////////////////////////////////////////////

			this._scope.$on(Documa.ui.meta.MetaUIEvents.START_LOADED, function(){
				// start view loaded successfully
				self._checklist["startview"] = true;
				checkInitState.call(self);
			});

			this._scope.$on(Documa.ui.meta.MetaUIEvents.DISTV_LOADED, function(){
				// distribution view loaded successfully
				self._checklist["distview"] = true;
				checkInitState.call(self);
			});

			this._scope.$on(Documa.ui.meta.MetaUIEvents.LOADV_LOADED, function(){
				self._checklist["loadview"] = true;
				checkInitState.call(self);
			});

			this._scope.$on(Documa.ui.meta.MetaUIEvents.CTRLINIT, function(evt, controller){
				self._mainController = controller;
			});
		},

		/**
		 * Navigates to the metaui's start view.
		 */
		showStartView: function(){
			this._carousel.carousel(0);
		},

		/**
		 * Navigates to the metaui's distribution view.
		 * @param {Documa.context.ApplicationContext} applicationCtxt
		 */
		showDistributionView: function(applicationCtxt){
			// start rendering the application's distribution state
			var self = this;
			this._scope.$applyAsync(function(){
				// forwarding application context to the distribution view's scope
				self._scope.currentApplication = applicationCtxt;
				self._carousel.carousel(1);
			});
		},

		/**
		 * @returns {Documa.ui.meta.subview.LoadingView}
		 */
		getLoaderView: function(){
			return this._loadingView;
		},

		/**
		 * Returns metaui's start view.
		 * @returns {Documa.ui.meta.subview.StartView}
		 */
		getStartView: function(){
			return this._startView;
		},

		/**
		 * Returns metaui's distribution view.
		 * @returns {Documa.ui.meta.subview.DistributionView}
		 */
		getDistributionView: function(){
			return this._distributionView;
		},

		/**
		 * Returns metaui's component distribution dialog.
		 *
		 * @returns {Documa.ui.meta.directives.DistributionDialog}
		 */
		getComponentDistributionDialog: function(){
			return this._compDistDialog;
		},

		/**
		 * Returns metaui's composé view.
		 * @returns {null}
		 */
		getComposeView: function(){
			return this._composeView;
		}
	};
}());

/**
 * definition of metaui directive
 */
Documa.CSRM.directive("metaUi", function($compile){
	return {
		restrict: "E",
		templateUrl: "lib/documa/ui/templates/mui_main.html",
		scope: {
			controller: "="
		},
		/**
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		link: function(scope, elem, attr){
			var mui_main = new Documa.ui.meta.MainView($compile);
			mui_main.setup(scope, elem, attr);
			scope.$applyAsync(function(){
				scope.controller = mui_main;
			});
		}
	};
});
