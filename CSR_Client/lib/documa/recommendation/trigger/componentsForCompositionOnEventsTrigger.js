Ext.namespace("Documa.recommendation.trigger");

EDYRA.recommendation.trigger.ComponentsForCompositionOnEventsTrigger = Ext.extend(Object, {
	superClass: null,
	subClass: null,
	cause: null,
	recommendationType: null,
	name: null,
	proxy: null,
	recMan: null,
	log: null,
	startEvents: null,
	eventDispatcher: null,
	init: function (recMan, eventDispatcher, log) {
		this.superClass = "runtime";
		this.subClass = "ForCompositionOnEvents";
		this.recommendationType = "ComponentsForCompositionOnEvents";
		this.eventDispatcher = eventDispatcher;
		this._recMan = recMan;
		this.log = log;
		this.log.debug("[Trigger " + this.subClass + "] initialized");
		this.startEvents = new Object();
	},

	checkCondition: function (msg) {
		if (this.startEvents[msg.getName()] != undefined) {
			if (msg.getName() == "componentInitialized") {
				var instanceIDs = this.CMan.getAllComponentInstances();
				var eName = msg.getName();
				for (var i = 0; i < instanceIDs.length; ++i) {
					var smcdl = this.CMan.getSMCDL(instanceIDs[i]);
					var con = Ext.cruise.client.Constants;
					var ut = Ext.cruise.client.Utility;
					var events = ut.getElementsByTagNameNS(con._MCDL_PRE_, con._MCDL_NS_, 'event', smcdl);


					var wiredEvents = this.eventBroker.listWiredEvents(instanceIDs[i]);
					var wiredOps = this.eventBroker.listHandlers(instanceIDs[i]);

					// if component is partly wired--> send message with all Events
					if ((wiredEvents.length > 0 || wiredOps.length > 0) && events.length > 0) {
						var evtNames = [];
						for (var y = 0; y < events.length; y++) {
							var evt = events[y];
							evtNames.push(evt.getAttribute("name"));
						}
						this.log.info("ComponentsForComposition trigger sets off");
						var name = this.subClass;

						msg.appendToBody('underlyingEvent', eName);
						msg.setName(name);
						msg.appendToBody('subClass', this.subClass);
						msg.appendToBody('cid', instanceIDs[i]);
						msg.appendToBody('events', evtNames);
						msg.appendToBody('exclude', 'undefined');
						msg.appendToBody('cause', "Components for Operations of " + this.CMan.getSMCDL(instanceIDs[i]).getAttribute("name"));
						msg.appendToBody('recoType', this.recommendationType);
						this.eventBroker.publish(msg);
					}

				}
			}
		}
	},
	fillStartEvents: function (sEvt) {
		//fill sEvt;
		if (sEvt.length > 0) {
			for (var i = 0; i < sEvt.length; i++) {
				//(this.sEvt.push(sEvt[i].name);
				console.log("Filling startEvet");
				this.startEvents[sEvt[i].name] = sEvt[i].name;
				console.log(this.startEvents[sEvt[i].name]);
			}
			this.log.debug("[Trigger " + this.subClass + "] filled with Events");
		} else {
			this.log.error("missing Events!!");
		}
	},
	handle: function (msg) {
		console.log("Handle ComponentsForCompositionOnEvents Trigger ...");
		var rm = Documa.RuntimeManager.getRecommendationManager();
		if (rm.getRecToggler()) {
			rm.serveRecommendationRequest(msg, Documa.communication.MessageFieldValues.APP_LEVEL);
		} else {
			console.log("Recommendations are off.");
		}
		console.log("ComponentsForCompositionOnEvents Trigger handled.");
	}
});