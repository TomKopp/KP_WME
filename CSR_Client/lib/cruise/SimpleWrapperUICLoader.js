/**
 * @class Ext.cruise.client.SimpleWrapperUICLoader
 * @author <a href="mailto:stefan.pietschmann">Stefan Pietschmann</a>
 * @author Carsten Radeck
 * @author Gerald Hübsch 
*/
Ext.cruise.client.SimpleWrapperUICLoader = Ext.extend(Object, {
	log: null,
	
	/**
	 * Constructor of the Simple Wrapper Loader
	 * @param {Object} logger an instance of the logger
	 * @constructor
	 */
	constructor: function(logger){
		this.log = logger;
		// set up internal array
		Ext.cruise.client.SimpleWrapperUICLoader.superclass.constructor.call(this);
		this.log.debug('[SimpleWrapperUICLoader] Ready.');
	},

	loadInstance: function(binding, compConfig, nextFctPtr, mediationInfo) {
		var instance;
		try {
			instance = this.invokeConstructor(binding, compConfig);
		}catch(exe){
			this.log.error("[SimpleWrapperUICLoader] Failed to instantiate the component (Exception while invocation of constructor)!");
			this.log.error(exe);
		}
		
		if (instance) {
			if (mediationInfo.needsWrapper) {
				/* if (and only if) mediation is required, the wrapper is instantiated */
				this.log.debug('[SimpleWrapperUICLoader] wrapper required');
				instance = new Ext.cruise.client.Wrapper(instance, mediationInfo);
			}
		}
		
		nextFctPtr(instance);
	},
	
	invokeConstructor: function(binding, compConfig) {
		var constructor = binding.getElementsByTagName('constructor')[0];
		
		var templateCode = constructor.getElementsByTagName('code')[0].firstChild.nodeValue;
		
		var instance = null;
		var constructorcode = Ext.cruise.client.expandTemplateCode(templateCode, compConfig, 'instance', null)[0];
		constructorcode += ';';
		instance= eval(constructorcode);

		return instance;
	}
});