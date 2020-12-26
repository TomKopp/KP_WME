/**
 * @class Ext.cruise.client.adapt.IAction Baseclass for Actions.
 * An Action implements a concrete adaptation technique, is managed and invoked by the
 * Adaptation Manager. 
 * 
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.IAction = Ext.extend(Object, {
	adaptMan: null,
	log: null,
	componentMan: null,
	contextMgr: null,
	
	constructor: function(adaptMan, componentMan, contextMgr, logger){
		Ext.cruise.client.adapt.IAction.superclass.constructor.call(this);
		this.adaptMan = adaptMan;
		this.log= logger;
		this.componentMan= componentMan;
		this.contextMgr= contextMgr;
	},
	
	/**
	 * Execute the action with specified configuration-parameters.
	 * This method is reserved for the Adaptation Manager and should not be called manually.
	 * 
	 * @protected
	 * @param {Object} config An object which contains required configuration parameters for processing the action.
	 */
	execute: function(config){}
});
