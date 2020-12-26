Ext.namespace("Documa.recommendation.trigger");

Documa.recommendation.trigger.ServiceUnavailableTrigger = Ext.extend(Object, {
	superClass: null,
	subClass: null,
	tag: null,
	recMan: null,
	log: null,
	startEvents: null,
	eventDispatcher: null,

	init: function (appMan, eventBroker, log) {
		this.tag = "Service Unavailable Trigger";
		this.subClass = "unavailableService of a Component";
		this.recommendationType = "Alternatives";
		this.recMan = recMan;
		this.log = log;
		this.eventDispatcher = eventDispatcher;
		this.log.debug("[Trigger " + this.tag + "] initialized");
		this.startEvents = new Object();
	},

	checkCondition: function (msg) {
		var eventName = msg.getName();
		if (this.startEvents[eventName] != undefined) {
			if (eventName == "serviceUnavailable") {
				this.log.debug("[Trigger " + this.subClass + "] started");
				msg.appendToBody('underlyingEvent', eventName);
				msg.setName(this.subClass);
				msg.appendToBody('subClass', this.subClass);
				msg.appendToBody('recoType', this.recommendationType);
				msg.appendToBody('cause', "The Service is not responding.");
				this.eventDispatcher.dispatch(msg);
			}
		} else {
			this.log.info("[Trigger " + this.subClass + "] doesn't react on " + eventName);
		}
	},
	fillStartEvents: function (sEvt) {
		//fill startEvents;
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