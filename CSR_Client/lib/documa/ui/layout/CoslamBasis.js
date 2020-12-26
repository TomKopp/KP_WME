Ext.namespace('Documa.ui.layout');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.layout.Layout');

Documa.ui.layout.CoslamBasis = Ext.extend(Documa.ui.layout.Layout, (function() {

	var TAG = "Documa.ui.layout.CoslamBasis";
	var _log = Documa.util.Logger;

	return {
		constructor : function(layoutObj) {
			Documa.ui.layout.CoslamBasis.superclass.constructor.call(this, layoutObj.name, layoutObj.agile, layoutObj.styles);
		}
	};
})());
