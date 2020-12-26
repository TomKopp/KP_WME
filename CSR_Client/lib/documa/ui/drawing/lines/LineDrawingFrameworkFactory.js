Ext.namespace('Documa.ui.drawing.lines');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.drawing.lines.RaphaelFramework');

Documa.ui.drawing.lines.LineDrawingFrameworkFactory = Ext.extend(Object, (function(){
	var TAG = 'Documa.ui.drawing.lines.LineDrawingFrameworkFactory';
	var _log = Documa.util.Logger;
	

	return {

		/**
		 * Return a line drawe for the specified framework.
		 * Default is RaphaelJS.
		 * @return {Documa.ui.drawing.lines.RaphaelFramework.LineDrawingFramework} Instance of the specified framework.
		 */
		lineDrawingFrameworkFactoryMethod: function(rootContainer, frameworkName){
			switch (frameworkName) {
				case 'raphael':
					return new Documa.ui.drawing.lines.RaphaelFramework(rootContainer);
					break;

				default:
					return new Documa.ui.drawing.lines.RaphaelFramework(rootContainer);
			}
		},

	};

})());
