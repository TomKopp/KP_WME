/**
 * @class Ext.cruise.client.TemplateCodeUICLoader
 * @author <a href="mailto:stefan.pietschmann">Stefan Pietschmann</a>
 * @author Carsten Radeck
 * @author Gerald Hübsch 
 */
Ext.cruise.client.TemplateCodeUICLoader = Ext.extend(Object, {
	
	/**
	 * Constructor of the Template Code Binding Loader
	 * @param {Object} logger an instance of the logger
	 * @constructor
	 */
	constructor: function(logger){
		// set up internal array
		Ext.cruise.client.TemplateCodeUICLoader.superclass.constructor.call(this);
		logger.debug('TemplateCodeUICLoader ready.');
	},

	loadInstance: function(binding, compConfig, nextFctPtr) {
		instPtr = new Ext.cruise.client.GenericUIComponent();
		instPtr.setBindings(binding, compConfig);
		instPtr.buildInstance(nextFctPtr);
	}
});