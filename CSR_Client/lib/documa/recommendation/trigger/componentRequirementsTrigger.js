Ext.namespace("Documa.recommendation.trigger");

EDYRA.recommendation.trigger.ComponentRequirementsTrigger = Ext.extend(Ext.cruise.client.recommendation.Trigger, {
	superClass: null,
	id: null,
	cause: null,
	name: null,
	componentSources: null,
	eventDispatcher: null,
	_recMan: null,
	log: null,
	init: function (recMan, eventDispatcher, log) {
		//EDYRA.recommendation.trigger.ComponentRequirementsTrigger.superclass.init.apply(this, [appMan, eventBroker, log]);
		this.eventDispatcher = eventDispatcher;
		this._recMan = recMan;
		this.log = log;
		this.superClass = "context";
		this.id = "componentRequirements";
		this.log.debug("[Trigger " + this.id + "] initialized");
		this.recommendationType = "componentRequirements";
		this.componentSources = new Object();
	},

	checkCondition: function (msg) {
		//check for correct startevent
		if (this.startEvents[msg.getName()] != undefined) {
			if (this.startEvents[msg.getName()].name != undefined) {
				var componentManager = this.appMan.getComponentManager();

				if (this.startEvents[msg.getName()].name == "componentInitialized") {
					var smcdl = componentManager.getSMCDL(msg.getBody().instanceID);
					var req = smcdl.getElementsByTagName("meta:requirement");
					// check if component is contextsensitiv
					if (req.length > 0) {
						//console.log("source vorhanden?: " + this.componentSources[msg.getBody().instanceID]);
						if (this.componentSources[msg.getBody().instanceID] != undefined) {
							this.appMan.getTriggerManager().deRegisterTriggerFromSource(this.id, msg.getBody().instanceID, this.componentSources[msg.getBody().instanceID]);
							delete this.componentSources[msg.getBody().instanceID];
						}
						this.appMan.getTriggerManager().registerTriggerOnSource(this.id, msg.getBody().instanceID, req[0].textContent);
						this.componentSources[msg.getBody().instanceID] = req[0].textContent;
						// make initial check--> maybe the context is already false in the current situation
						var isValid = this.appMan.getAdaptationManager().queryContext(req[0].textContent);
						// send message if conditon isnt satisfied
						if (isValid == "false") {
							var name = this.id;
							var eventName = msg.getName();
							msg.appendToBody('underlyingEvent', eventName);
							msg.appendToBody('cid', instanceID);
							msg.setName(name);
							msg.appendToBody('subClass', this.id);
							msg.appendToBody('cause', "Requirement of " + componentManager.getSMCDL(instanceID).getAttribute('name') + " not fullfilled!");
//							Ext.applyIf(this.triggerData, msg.getBody());
//							msg.appendToBody('equals', this.equals());	
							this.eventBroker.publish(msg);
						}
					}
				}

				if (this.startEvents[msg.getName()].name == "componentRemoved") {
					var ID = msg.getBody().instanceID;
					if (this.componentSources[ID] != undefined) {
						this.appMan.getTriggerManager().deRegisterTriggerFromSource(this.id, ID, this.componentSources[ID]);
						delete this.componentSources[ID];
					}
				}

				if (this.startEvents[msg.getName()].name == "contextChanged") {
					// only if source from the xml-description matches the sended contextparamter the calculation starts
					console.log("condition: " + msg.getBody().value);
					console.log("changedSource: " + msg.getBody().contextParameter);
					if (msg.getBody().value == "false") {
						if (this.startEvents[msg.getName()] != undefined) {
							console.log("context changed");
							for (var instanceId in this.componentSources) {
								if (this.componentSources[instanceId] == msg.getBody().contextParameter) {
									console.log("Mapping found");
									var name = this.id;
									var eventName = msg.getName();
									var msgNew = new Ext.cruise.client.communication.Message();
									msgNew.appendToBody('underlyingEvent', eventName);
									msgNew.appendToBody('cid', instanceId);
									msgNew.setName(name);
									msgNew.appendToBody('subClass', this.id);
									// msgNew.appendToBody('recoType', this.recommendationType);
									msgNew.appendToBody('source', msg.getBody().contextParameter);
									msgNew.appendToBody('cause', "Requirement of " + componentManager.getSMCDL(instanceId).getAttribute('name') + " not fullfilled!");
									this.eventBroker.publish(msgNew);
								}
							}
						}
					}
				}
			}
		}
	},
	fillContextSource: function (instanceID, source) {
		this.startEvents["contextChanged"].sources[instanceID] = source;
	},
	deleteContextSource: function (instanceID, source) {
		for (var src in this.startEvents["contextChanged"].sources) {
			if (this.startEvents["contextChanged"].sources[instanceID] == source) {
				delete this.startEvents["contextChanged"].sources[instanceID];
			}
		}
	},
	fillStartEvents: function (sEvt) {
		//fill sEvt;
		if (sEvt.length > 0) {
			for (var i = 0; i < sEvt.length; i++) {
				//(this.sEvt.push(sEvt[i].name);
				//console.log("Filling startEvet");
				this.startEvents[sEvt[i].name] = {};
				this.startEvents[sEvt[i].name]['name'] = sEvt[i].name;
				this.startEvents[sEvt[i].name]['sources'] = new Array();
				//console.log(this.startEvents[sEvt[i].name]);
			}
			this.log.debug("[Trigger " + this.id + "] filled with Events");
		} else {
			this.log.error("missing Events!!");
		}
	},
	dispose: function () {
		Documa.recommendation.trigger.ComponentRequirementsTrigger.superclass.dispose.call(this);
		delete this.componentSources;
	},

	handle: function (msg) {
		console.log("Handle componentRequirements Trigger ...");
		var rm = Documa.RuntimeManager.getRecommendationManager();
		if (rm.getRecToggler()) {
			rm.serveRecommendationRequest(msg, Documa.communication.MessageFieldValues.APP_LEVEL);
		} else {
			console.log("Recommendations are off.");
		}
		console.log("componentRequirements Trigger handled.");
	}
});