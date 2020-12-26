/**
 * @class Ext.cruise.client.adapt.IRuleEngine Baseclass for rule engines.
 * @public
 */
Ext.cruise.client.adapt.IRuleEngine = Ext.extend(Object, {
	rules: null,
	log: null,
	adaptman: null,
	contextMgr: null,

	constructor: function(log, adaptman, contextMgr){
		Ext.cruise.client.adapt.IRuleEngine.superclass.constructor.call(this);
		this.log= log;
		this.adaptman= adaptman;
		this.contextMgr= contextMgr;
		this.rules= new Array();
	},
	
	dispose: function(){
		this.rules.length=0;
	},

	handleEvent: function(data, eventname){
	},

	parseRules: function(domelement){
	},

	addRule: function(rule){
	},

	removeRule: function(id){
	}
});