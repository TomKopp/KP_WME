Ext.namespace("Documa.ui.meta.directives");

/**
 * @class
 */
Documa.ui.meta.directives.IconItem = Ext.extend(Object, function(){
	var TAG = "Documa.ui.meta.directives.IconItem";
	var _log = Documa.util.Logger;
	/////////////////////
	// private methods //
	/////////////////////

	/**
	 * Fires close event.
	 *
	 * @param {jQuery.Event} event
	 */
	function fireClose(event){
		this._scope.$emit(Documa.ui.meta.MetaUIEvents.ITEM_CLOSED, this);
	}

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
		},

		/**
		 * Initiates icon label item.
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		setup: function(scope, elem, attr){
			this._scope = scope;
			this._elem = elem;

			// bind event handler
			this._scope.close = fireClose.bind(this);
		},

		/**
		 * @returns {string}
		 */
		getId: function(){
			return this._scope.id;
		}
	};
}());

/**
 * Directive declaration.
 */
Documa.CSRM.directive("muiIconItem", function($compile){
	return {
		restrict: "E",
		templateUrl: "lib/documa/ui/templates/mui_iconitem.html",
		scope: {
			icon: "@",
			label: "@",
			layout: "@",
			id: "@"
		},
		link: function(scope, elem, attr){
			var item = new Documa.ui.meta.directives.IconItem($compile);
			item.setup(scope, elem, attr);
		}
	};
});