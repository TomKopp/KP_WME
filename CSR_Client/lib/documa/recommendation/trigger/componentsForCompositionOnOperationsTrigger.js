Ext.namespace("Documa.recommendation.trigger");

EDYRA.recommendation.trigger.ComponentsForCompositionOnOperationsTrigger = Ext.extend(Object, {
	superClass: null,
	subClass: null,
	cause: null,
	name: null,
	recommendationType: null,
	proxy: null,
	recMan: null,
	log: null,
	startEvents: null,
	eventDispatcher: null,
	init: function (recMan, eventDispatcher, log) {
		this.superClass = "runtime";
		this.subClass = "componentsForComposition";
		this.recommendationType = "componentsForComposition";
		this.recMan = recMan;
		this.log = log;
		this.eventDispatcher = eventDispatcher;
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
					var operations = ut.getElementsByTagNameNS(con._MCDL_PRE_, con._MCDL_NS_, 'operation', smcdl);


					var wiredEvents = this.eventBroker.listWiredEvents(instanceIDs[i]);
					var wiredOps = this.eventBroker.listHandlers(instanceIDs[i]);
					// if component is partly wired--> send message with all operations
					if ((wiredEvents.length > 0 || wiredOps.length > 0) && operations.length > 0) {
						var mcdl = this.CMan.getSMCDL(instanceIDs[i]);
						var opNames = [];
						var operations = mcdl.querySelectorAll("operation");
						for (var y = 0; y < operations.length; y++) {
							var op = operations[y];
							opNames.push(op.getAttribute("name"));
						}
						this.log.info("ComponentsForComposition trigger sets off");
						var name = this.subClass;

						msg.appendToBody('underlyingEvent', eName);
						msg.setName(name);
						msg.appendToBody('subClass', this.subClass);
						msg.appendToBody('cid', instanceIDs[i]);
						msg.appendToBody('operations', this.CMan.getUnwiredOperations(instanceIDs[i]));
						msg.appendToBody('exclude', 'undefined');
						msg.appendToBody('cause', "Components for Operations of " + this.CMan.getSMCDL(instanceIDs[i]).getAttribute("name"));
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
		console.log("Handle componentsForComposition Trigger ...");
		var rm = Documa.RuntimeManager.getRecommendationManager();
		if (rm.getRecToggler()) {
			rm.serveRecommendationRequest(msg, Documa.communication.MessageFieldValues.APP_LEVEL);
		} else {
			console.log("Recommendations are off.");
		}
		console.log("componentsForComposition Trigger handled.");
	}
});