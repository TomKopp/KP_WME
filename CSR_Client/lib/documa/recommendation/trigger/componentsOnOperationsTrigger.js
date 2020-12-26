Ext.namespace("Documa.recommendation.trigger");

Documa.recommendation.trigger.ComponentsOnOperationsTrigger = Ext.extend(Object, {
	tag: null,
	recMan: null,
	log: null,
	startEvents: null,
	eventDispatcher: null,

	init: function (recMan, eventDisatcher, log) {
		this.tag = "Components on Operations Trigger";
		this.recMan = recMan;
		this.log = log;
		this.eventDispatcher = eventDispatcher;
		this.log.debug("[Trigger " + this.tag + "] initialized");
		this.startEvents = new Object();
	},

	checkCondition: function (msg) {
		this.log.info("[Trigger " + this.tag + "] got the Event: " + msg.getName());
		var eventName = msg.getName();

		if (this.startEvents[eventName] != undefined) {
			if (eventName == "componentInitialized") {
				this.log.debug("[Trigger " + this.tag + "] started");
				this.investigateComponent(msg.getBody());
			}
		} else {
			this.log.info("[Trigger " + this.tag + "] doesn't react on " + eventName);
		}
	},

	investigateComponent: function (componentData) {
		if (componentData.isUI == "true") {
			if (wiredEvents.length == 0 && (operations.length > 0 && wiredOps.length == 0)) {
				// TODO: send unwired component event
			}
		}
	},

	fillStartEvents: function (sEvt) {
		if (sEvt.length > 0) {
			for (var i = 0; i < sEvt.length; i++) {
				this.startEvents[sEvt[i].name] = sEvt[i].name;
			}
			this.log.debug("[Trigger " + this.tag + "] filled with Events");
		} else {
			this.log.error("missing Events!!");
		}
	}
});