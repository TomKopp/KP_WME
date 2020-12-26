Ext.namespace('Documa.recommendation');

Documa.require('Documa.util.Logger');
Documa.require('Documa.communication.events.EventFactory');
Documa.require('Documa.communication.events.Event');
Documa.require('Documa.communication.events.SystemEvent');
Documa.require('Documa.communication.events.ApplicationEvent');
Documa.require('Documa.ui.sidebar.SidebarView');
Documa.require('Documa.ui.views.capview.LabelGenerator');
Documa.require('Documa.ui.UIManager');

/**
 * @typedef {Object} RecommendationJob
 * @property {String} type
 * @property {String} name
 * @property {Array} payload
 */

/**
 * @class Documa.recommendation.DisplayPhaseHandler
 * This class is responsible for displaying determined advice for a certain recommendation job.
 *
 *  @author wagner, siekmann
 */
Documa.recommendation.DisplayPhaseHandler = Ext.extend(Object, function() {
	const TAG = "Documa.recommendation.DisplayPhaseHandler";
	const LOG = Documa.util.Logger;
	return {
		visible: false,
		labelGenerator: null,
		/**
		 * @param {Documa.communication.events.EventDispatcher} eventDispatcher
		 */
		constructor: function(eventDispatcher) {
			Documa.recommendation.DisplayPhaseHandler.superclass.constructor.call(this);
			this.log = LOG;
			this.eventDispatcher = eventDispatcher;
			this.eventFactory = new Documa.communication.events.EventFactory();
			this.labelGenerator = new Documa.ui.views.capview.LabelGenerator();
			this.log.debug(TAG, "Created.");
		},
		
		/**
		 * @param {Documa.communication.Message} msg
		 */
		parseJob: function(msg) {
			this.log.debug(TAG, "Parsing a new job.");
			switch (msg.getMessageTag()) {
				case 'publishrecommendation':
					let payload = msg.getPayload();
					let recommendations = null;
					let matches = [];
					let keys = [];
					let matchNode = null;
					
					// strip json to matches
					if(payload[1]) {
						matchNode = payload[1];
					} else {
						matchNode = payload[0];
					}
					
					for(let key in matchNode) {
						if(matchNode.hasOwnProperty(key)) {
							matches.push(matchNode[key]);
							keys.push(key);
						}
					}
					
					if(matches[1].matches) {
						matches = matches[1].matches;
					} else if(matches[0].matches) {
						matches = matches[0].matches;
					} else {
						this.log.debug(TAG, "Recommendation did not contain any matches.");
					}
					let handledMatches = [];
					
					// loop through matches
					if(matches) {
						let matchArray = [];
						for(let key in matches) {
							if(matches.hasOwnProperty(key)) {
								let match = matches[key];
								
								if($.inArray(match.id, handledMatches) == -1) {
									// get cap label
									let activity = match.operation.capability.activity.label;
									let entity = match.operation.capability.entity.label;
									let capLabel = this.labelGenerator.getInitialLabelForCapability({
										'activity': activity,
										'entity': entity
									});
									
									matchArray.push({
										"id": match.id,
										"name": match.name,
										"operation": match.operation.name,
										"capLabel": capLabel,
										"screenshot": match.screenshot,
										"rating": match.rating
									});
								}
								
								handledMatches.push(match.id);
							}
						}
						
						//find the property name within the keys
						let iProperty = 0;
						while (iProperty < keys.length - 1 &&
						(keys[iProperty] == "recommendationType" /* or any other known field */)
							) {
							iProperty++;
						}
						let property = keys[iProperty];
						
						let parsedMatches = {
							property: property,
							matches: matchArray
						};
						
						// create job
						let matchJob = {
							type: "recommendationPanel",
							name: "recommendationFound",
							payload: parsedMatches
						};
						this.handleJob(matchJob);
					}
					
					// strip json to recommendation objects
					for(let key in payload) {
						if(payload.hasOwnProperty(key)) {
							let first = payload[key];
							for(let key2 in first) {
								if(first.hasOwnProperty(key2)) {
									let second = first[key2];
									for(let key3 in second) {
										if(second.hasOwnProperty(key3)) {
											recommendations = second[key3];
											break;
										}
									}
									break;
								}
							}
							break;
						}
					}
					
					// loop through recommendations
					if(recommendations) {
						let parsedRecommendations = [];
						for(let key in recommendations) {
							if(recommendations.hasOwnProperty(key)) {
								let rec = recommendations[key];
								for(let i = 0; i < rec.length; ++i) {
									parsedRecommendations.push({
										"cid": key,
										"type": rec[i].interfaceType,
										"name": rec[i].interfaceElement,
										"mapping": rec[i].mediationRule
									});
								}
							}
						}
						
						let recJob = {
							type: "recommendations",
							name: "recommendationFound",
							payload: parsedRecommendations
						};
						this.handleJob(recJob);
						this.log.debug(TAG, JSON.stringify(recJob.payload));
					} else {
						this.log.error(TAG, new Error('No Recommendations Parsed. Seems there were no matching recommendations.'));
					}
					break;
			}
		},
		
		/**
		 * Takes a recommendation job and performs proper actions for displaying the results.
		 * @param {RecommendationJob} job
		 */
		handleJob: function(job) {
			this.log.debug(TAG, "Handling new job.");
			switch (job.type) {
				case 'recommendations':
					this.log.debug(TAG, "Handling recommendation job: " + job.name);
					// fire event to notify ui
					let event = this.eventFactory.create(Documa.communication.MessageFieldValues.APP_LEVEL, job.name, job.payload);
					this.eventDispatcher.dispatchEvent(event);
					break;
				case 'recommendationPanel':
					this.log.debug(TAG, "Handling recommendation job: " + job.name);
					if(job.payload.matches.length > 0) {
						// send to ui panel
						let manager = new Documa.RuntimeManager.getUIManager().getSidebarManager();
						manager.getSidebarRec().fillRecMenu(job.payload);
					}
					break;
				case 'redistribution':
					this.log.debug(TAG, "Handling recommendation job: " + job.name);
					// visualize several redistribution options
					/** @type {Array.<Documa.distribution.migration.options.MigrationOption>} */
					let migrationOptions = job.payload;

                    Documa.RuntimeManager.getUIManager().getMigrationManager().setMigrationOptions(migrationOptions);
                    Documa.RuntimeManager.getUIManager().getMigrationManager().showMigration();
                    /* ******************************************* */
					/* TODO: DIRE-menu activation starts here      */
					/* ******************************************* */
					
					//throw new Error("Incomplete migration options processing!");
					break;
			}
		}
	}
}());