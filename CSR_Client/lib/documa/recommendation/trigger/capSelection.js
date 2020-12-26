Ext.namespace("Documa.recommendation.trigger");
Documa.require('Documa.recommendation.RecommendationManager');

Documa.recommendation.trigger.capSelection = Ext.extend(Object, {
	superClass: null,
	subClass: null,
	recommendationType: null,
	_recMan: null,
	log: null,
	startEvents: null,
	eventDispatcher: null,

	init: function (recMan, eventDispatcher, log) {
		this.superClass = "explicit";
		this.subClass = "capSelection";
		this.recommendationType = "capSelection";
		this.eventDispatcher = eventDispatcher;
		this._recMan = recMan;
		this.log = log;
		this.log.debug("[Trigger " + this.subClass + "] initialized");
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
		// fill sEvt;
		if (sEvt.length > 0) {
			for (var i = 0; i < sEvt.length; i++) {
				this.startEvents[sEvt[i].name] = sEvt[i].name;
			}
			this.log.debug("[Trigger " + this.subClass + "] filled with Events");
		} else {
			this.log.error("missing Events!!");
		}
	},

	handle: function (msg) {
		console.log("Handle CapSelection Trigger ...");

		var rm = Documa.RuntimeManager.getRecommendationManager();
		if (rm.getRecToggler()) {
			rm.serveRecommendationRequest(msg, Documa.communication.MessageFieldValues.APP_LEVEL);
		} else {
			console.log("Recommendations are off.");
		}
		console.log("CapSelection Trigger handled.");
	}
});