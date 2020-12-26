/**
 * @class Ext.cruise.client.adapt.IContextManager Baseclass for Context Managers.
 * It provides references to the logger, the Adaptation Manager and a Context Service Adapter.
 * @public
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.IContextManager = Ext.extend(Ext.util.Observable, {
	log: null,
	adaptman: null,
	adapter: null,

	constructor: function(logger, adaptman){
		Ext.cruise.client.adapt.IContextManager.superclass.constructor.call(this);
		
		this.log= logger;
		this.adaptman= adaptman;
	},
	
	init: function( domelement, contextServiceAdapter){
	},
	
	dispose: function(){},
	
	receiveUserProfile: function(userid){
	},
	
	collectContext: function(userid, neededContextParams){
	},
	
	activateMonitor: function(monitorid){
	},
	
	deactivateMonitor: function(monitorid){
	},
	
	getContextValue: function(path){
	},
	
	queryContext: function(sparql){
	},
	
	updateRemoteContext: function(monitor, context){
	},
	
	updateLocalContext: function(/* parsed path */ parts, context){
	}
});