Ext.namespace("Documa.ui.meta.subview");

/**
 * @class
 */
Documa.ui.meta.subview.LoadingView = Ext.extend(Object, function(){
	var TAG = "Documa.ui.meta.subview.LoadingView";
	var _log = Documa.util.Logger;
	/////////////////////
	// private methods //
	/////////////////////

	// TODO: add here private methods

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
			this._compile = compile;
			this._scope = null;
			this._elem = null;

			/**
			 * @type {jQuery}
			 * @private
			 */
			this._modal = null;
		},

		/**
		 * Init view.
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		setup: function(scope, elem, attr){
			this._scope = scope;
			this._elem = elem;
			var self = this;

			/**
			 * @type {String}
			 */
			this._scope.message = null;

			this._scope.$applyAsync(function(){
				self._scope.$emit(Documa.ui.meta.MetaUIEvents.LOADV_LOADED, self);
			});

			this._modal = elem.find("#csr-mui-loader");
			// initialize modal loader windows
			this._modal.modal({
				backdrop: "static",
				keyboard: false,
				show: false
			});
		},

		/**
		 * Shows loader.
		 * @param {String} text
		 */
		show: function(text){
			var self = this;
			this._scope.$applyAsync(function(){
				self._scope.message = text;
				self._modal.modal("show");
			});
		},

		/**
		 * Hides loader.
		 */
		hide: function(){
			this._modal.modal("hide");
		}
	};
}());

/**
 * tag definition.
 */
Documa.CSRM.directive("muiLoader", function($compile){
	return {
		restrict: "E",
		templateUrl: "lib/documa/ui/templates/mui_loader.html",
		scope: {
			controller: "="
		},
		link: function(scope, elem, attr){
			var controller = new Documa.ui.meta.subview.LoadingView($compile);
			controller.setup(scope, elem, attr);
			scope.$applyAsync(function(){
				// forwarding controller to parent scope
				scope.controller = controller;
			});
		}
	};
});