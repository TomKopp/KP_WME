Ext.namespace("Documa.ui.mainmenu");

Documa.require("Documa.util.Logger");


/**
 * @typedef {Object} ComponentSearchResult
 * @property {String} results
 */


/**
 * @interface
 */
Documa.ui.mainmenu.SearchResultView = Ext.extend(Object, function(){
	var TAG = "Documa.ui.mainmenu.SearchResultView";
	var _log = Documa.util.Logger;
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function(){
			this._isVisible = false;
		},

		/**
		 * @returns {boolean}
		 */
		isVisible: function(){
			return this._isVisible;
		},

		show: function(){
			this._isVisible = true;
		},

		refresh: function(){
			throw new Error("Not implemented!");
		},

		hide: function(){
			this._isVisible = false;
		},

		/**
		 * Load results into the search view.
		 * @param {ComponentSearchResult} searchResults
		 */
		loadResults: function(searchResults){
			throw new Error("Not implemented!");
		}
	};
}());