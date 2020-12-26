Ext.namespace("Documa.ui.utility");

Documa.ui.utility.GenericLoadingSpinner = Ext.extend(Object, (function(){

	var TAG = "Documa.ui.utility.GenericLoadingSpinner";
	var _log = Documa.util.Logger;

	var _domSpinnerObject = null;
	
	return {
		constructor: function(){
			Documa.ui.utility.GenericLoadingSpinner.superclass.constructor.call(this);
			
		},
		
		show: function(label){
			// add a div to the metaview canvas which holds the component
			var spinnerCode = "<div id='genericSpinnerDiv' class='spinnerCanvas'><div class='spinner'><div class='bounce1'></div><div class='bounce2'></div><div class='bounce3'></div><div class='bounce4'></div>";
			spinnerCode += "<div class='bounce5'></div></div><div class='spinnerText'>";
			spinnerCode += label + " is loading...</div></div>";
			
			Ext.DomHelper.insertFirst('centralViewPortPanel', spinnerCode);
		},
		
		/**
		 * Hide loading spinner by
		 */
		hide: function(){
			var element = Ext.get("genericSpinnerDiv");
			if (element != null || element != undefined) {
				element.remove();
			}
		}
		
	};
})());