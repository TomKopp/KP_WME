Ext.namespace("Documa.recommendation.trigger");

Documa.recommendation.trigger.SearchTrigger = Ext.extend(Object, {
	tag: null,
	recMan: null,
	log: null,
	startEvents: null,
	eventDispatcher: null,

	init: function (recMan, eventDispatcher, log) {
		this.tag = "Search Trigger";
		this.subClass = "componentsSearch";
		this.recommendationType = "NLRequest";
		this.recMan = recMan;
		this.log = log;
		this.eventDispatcher = eventDispatcher;
		this.log.debug("[Trigger " + this.tag + "] initialized");
		this.startEvents = new Object();
	},

	checkCondition: function (msg) {
		if (this.startEvents[msg.getName()] != undefined) {
			var eventName = msg.getName();
			var name = this.subClass;
			msg.setName(name);
			msg.appendToBody('underlyingEvent', eventName);
			msg.appendToBody('subClass', this.subClass);
			msg.appendToBody('recoType', this.recommendationType);
			this.eventDispatcher.dispatch(msg);
		} else {
			this.log.info("[Trigger " + this.subClass + "] doesn't react on " + msg.getName());
		}
	},

	fillStartEvents: function (sEvt) {
		if (sEvt.length > 0) {
			for (var i = 0; i < sEvt.length; i++) {
				this.startEvents[sEvt[i].name] = sEvt[i].name;
			}
			this.log.debug("[Trigger " + this.subClass + "] filled with Events");
		} else {
			this.log.error("missing Events!!");
		}
	}
});