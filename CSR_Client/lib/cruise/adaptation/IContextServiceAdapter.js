/**
 * @class Ext.cruise.client.adapt.IContextServiceAdapter Interface for ContextServiceAdapters
 * @public
 */
Ext.cruise.client.adapt.IContextServiceAdapter = Ext.extend(Object, {
	log: null,
	crocoUrl: null,
	contextmgr: null,

	constructor: function(logger, contextmgr, crocoUrl){
		Ext.cruise.client.adapt.IContextServiceAdapter.superclass.constructor.call(this);

		this.log= logger;
		this.contextmgr= contextmgr;
		this.crocoUrl= crocoUrl;
		if (this.crocoUrl.charAt(this.crocoUrl.length-1)=='/')
			this.crocoUrl=this.crocoUrl.substr(0, this.crocoUrl.length-1);
	},
	
	init: function(contextStructureURL, userid){},
	
	dispose: function(){},
	
	subscribe: function(requiredContextParams, ucp) {},
	
	getProfile: function(userid){},
	
	queryContext: function(sparql){},

	getContextValue: function(property, ucp){},

	sendContext: function(context, ucp){}
});