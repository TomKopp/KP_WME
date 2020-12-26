Ext.namespace('Documa.recommendation');

Documa.recommendation.TriggerTest = Ext.extend(Object, {

	constructor: function () {

	},

	start: function () {
		var trigger = {

			evt: "capabilitySelected",
			cid: "http://mmt.inf.tu-dresden.de/EDYRA/prototype/Map",
			type: "capability",
			capid: "cap02",
		};

		var msg = new Documa.communication.events.Event();
		console.log("### TriggerTest started ###");

		msg.setSenderId("testid");
		msg.setTimestamp("testtimestamp");
		msg.setMessageTag(trigger.evt);
		var payload = '{"event":"' + trigger.evt + '", "cid":' + '"' + trigger.cid + '", "type":' + '"' + trigger.type + '", "id":' + '"' + trigger.id + '"}';
		msg.setPayload(payload);
		var evd = Documa.RuntimeManager.getEventDispatcher();
		evd.dispatchEvent(msg);
	}


});
