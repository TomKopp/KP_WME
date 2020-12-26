Ext.namespace('Documa.ui.layout');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.layout.Layout');

Documa.ui.layout.ListLayout = Ext.extend(Documa.ui.layout.Layout, (function() {

	var TAG = "Documa.ui.layout.ListLayout";
	var _log = Documa.util.Logger;

	return {
		constructor : function(layoutObj) {
			Documa.ui.layout.ListLayout.superclass.constructor.call(this, layoutObj.name, layoutObj.agile, layoutObj.styles);
		}

	};
})());
