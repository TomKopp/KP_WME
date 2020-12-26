Ext.namespace("Documa.communication.commands");

Documa.require("Documa.communication.commands.SystemCommand");
Documa.require("Documa.communication.commands.ApplicationCommand");
Documa.require("Documa.communication.commands.ShowAppCommand");
Documa.require("Documa.communication.commands.IntegrateResourcesCommand");
Documa.require("Documa.communication.commands.IntegrateComponentCommand");
Documa.require("Documa.communication.commands.AddChannelCommand");
Documa.require("Documa.communication.commands.NoChannelCommand");
Documa.require("Documa.communication.commands.InitialStateTransitionCommand");
Documa.require("Documa.communication.commands.LayoutCommand");
Documa.require("Documa.communication.commands.PublishMessageCommand");
Documa.require("Documa.communication.commands.SetPropertyMessageCommand");
Documa.require("Documa.communication.commands.SearchCoReCommand");
Documa.require("Documa.communication.commands.ShowSearchResultsCommand");
Documa.require("Documa.communication.commands.LoginCommand");
Documa.require("Documa.communication.commands.UpdateBuddyListMessageCommand");
Documa.require("Documa.communication.commands.GetPropertiesMessageCommand");
Documa.require("Documa.communication.commands.UpdateRightCommand");
Documa.require("Documa.communication.commands.ChoiceDistCommand");
Documa.require("Documa.communication.commands.ComponentMessagePublishCommand");
Documa.require("Documa.communication.commands.RuntimeRequestCommand");
Documa.require("Documa.communication.commands.IntegrateTriggerCommand");
Documa.require("Documa.communication.commands.PublishRecommendationCommand");

Documa.communication.commands.RequestActions = {
	PREP_MIGRATE: "prepmigrt",
	CMIT_MIGRATE: "comtmigrt",
	ABRT_MIGRATE: "abrtmigrt",
	PREP_REALIZE: "prepreal",
	CMIT_REALIZE: "comtreal",
	ABRT_REALIZE: "abrtreal",
	PREP_MODIFYCHANNEL: "prepmodifychannel",
	COMT_MODIFYCHANNEL: "comtmodifychannel"
};

Documa.communication.commands.ChannelModifiyTypes = {
	CREATE: "create",
	REMOVE: "remove"
};

/**
 * Class responsible for creating different command messages.
 * @class
 */
Documa.communication.commands.CommandFactory = Ext.extend(Object, (function() {
	var TAG = "Documa.communication.commands.CommandFactory";
	/////////////////////
	// private methods //
	/////////////////////
	function getApplicationPayload(appcontext) {
		return {
			id: appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_ID),
			instid: appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID),
			version: appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION)
		};
	}
	
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * @constructs
		 */
		constructor: function() {
			Documa.communication.commands.CommandFactory.superclass.constructor.call(this);
		},
		
		/**
		 * Creates the command object from the given parameters.
		 * @param {Integer} level
		 *                  application or system level messages
		 * @param {String} msgtag
		 *                  command identificator
		 * @param {Object} payload command payload
		 * @returns {Documa.communication.commands.Command}
		 */
		create: function(level, msgtag, payload) {
			var cmd = null;
			switch (level) {
				case Documa.communication.MessageFieldValues.SYS_LEVEL:
					// create an system command
					cmd = new Documa.communication.commands.SystemCommand();
					break;
				case Documa.communication.MessageFieldValues.APP_LEVEL:
					cmd = new Documa.communication.commands.ApplicationCommand();
					break;
			}
			cmd.setMessageTag(msgtag);
			cmd.setPayload(payload);
			cmd.setTimestamp(new Date().getTime());
			return cmd;
		},
		
		/**
		 * Returns request command message that should be forwarded to specified set of receiver.
		 *
		 * @param {String} appid id of current application
		 * @param {String} appversion version of current application
		 * @param {String} appinstid server-side unique instance id of application
		 * @param {String} sender session id of request sender
		 * @param {Array} receivers array of receiver session ids
		 * @param {String} actionName name of action to be executed on receiver-side
		 * @param {Object} params map containing several action parameters
		 * @param {String} reqid id of request message used to create a correlation between the response and its previous request
		 * @returns {Documa.communication.commands.Command}
		 */
		createRuntimeRequest: function(appid, appversion, appinstid, receivers, actionName, params) {
			var payload = {
				id: appid,
				version: appversion,
				instid: appinstid,
				action: actionName,
				params: params,
				recvs: receivers
			};
			// create command instance
			return this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
				Documa.communication.commands.Commands.REQRUNTIME, payload);
		},
		
		/**
		 * Creates a command for requesting a set of component descriptors from server-side component manager.
		 *
		 * @param {String} appid id of current application
		 * @param {String} appversion version of current application
		 * @param {String} appinstid server-side unique instance id of application
		 * @param {Array} cidarray set of component ids to retrieve corresponding component descriptors
		 * @returns {Documa.communication.commands.Command}
		 */
		createRequestComponentDescriptorCommand: function(appid, appversion, appinstid, type, cidarray) {
			let payload = {
				id: appid,
				version: appversion,
				instid: appinstid,
				rtype: type,
				components: cidarray
			};
			return this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
				Documa.communication.commands.ApplicationCommands.REQUESTSMCDLS, payload);
		},
		
		/**
		 * Creates a command for publishing a component message on server-side, i. e. the server forwards
		 * the message to subscribing component executed within the server-side or a remote client runtime context.
		 *
		 * @param {String} appid id of current application
		 * @param {String} appversion version of current application
		 * @param {String} appinstid server-side unique instance id of application
		 * @param {String} cinstid instance id of sending component
		 * @param {Ext.cruise.client.Message} message message object to publish on server-side
		 * @returns {Documa.communication.commands.Command}
		 */
		createComponentPublishCommand: function(appid, appversion, appinstid, cinstid, message) {
			var payload = {
				id: appid,
				version: appversion,
				instid: appinstid,
				sender: cinstid,
				message: message.message
			};
			// creating and return command with payload data
			var cmd = this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
				Documa.communication.commands.ApplicationCommands.CPUBLISH, payload);
			return cmd;
		},
		
		/**
		 * Creates a command for distribution of channel modifications on server-side.
		 *
		 * @param {String} appid id of current application
		 * @param {String} appversion version of current application
		 * @param {String} appinstid server-side unique instance id of application
		 * @param {String} modificationType the type of the modification as given in {Documa.communication.commands.ChannelModifiyTypes}
		 * @param {Channel} channel the channel to be modified
		 * @returns {Documa.communication.commands.Command}
		 */
		createModifyChannelCommand: function(appid, appversion, appinstid, modificationType, channel) {
			let payload = {
				id: appid,
				version: appversion,
				instid: appinstid,
				modificationType: modificationType,
				channel: channel
			};
			// creating and return command with payload data
			let cmd = this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
				Documa.communication.commands.ApplicationCommands.MODIFYCHANNEL, payload);
			return cmd;
		},
		
		/**
		 * Creates a command that creates an application context on server-side as well as on all
		 * the specified runtime containers.
		 *
		 * @param {String} id application id
		 * @param {String} version application version
		 * @param {String} name application name
		 * @param {Array.<String>} containers potential runtime containers
		 * @param {String} jobid
		 * @param {Number} [tc] testcase
		 * @returns {Documa.communication.commands.Command}
		 */
		createApplicationCreateCommand: function(id, version, name, containers, jobid, tc) {
			let payload = {
				id: id,
				version: version,
				name: name,
				containers: containers,
				jobid: jobid
			};
			// add optional testcase specificator for loading predefined test cases
			if(tc) payload.testcase = tc;
			let cmd = this.create(Documa.communication.MessageFieldValues.SYS_LEVEL,
				Documa.communication.commands.SystemCommands.CREATEAPP, payload);
			return cmd;
		},
		
		/**
		 * Creates a command that triggers the loading of a predefined application on server-side.
		 * @param {String} id application id
		 * @param {String} version application version
		 * @param {String} name application name
		 * @param {String} jobid application loading job id
		 * @returns {Documa.communication.commands.Command}
		 */
		createApplicationStartCommand: function(id, version, name, jobid) {
			let payload = {
				id: id,
				version: version,
				name: name,
				jobid: jobid
			};
			// create startapp command object
			/** @type {Documa.communication.commands.SystemCommand} */
			let startappcmd = this.create(Documa.communication.MessageFieldValues.SYS_LEVEL,
				Documa.communication.commands.SystemCommands.STARTAPP, payload);
			return startappcmd;
		},
		
		/**
		 * Creates a command for pausing the application in its current lifecycle state.
		 *
		 * @param {String} appid id of current application
		 * @param {String} appversion version of current application
		 * @param {String} appinstid server-side unique instance id of application
		 * @param {Number} code code of interruption cause
		 * @returns {Documa.communication.commands.Command}
		 */
		createApplicationPauseCommand: function(appid, appversion, appinstid, code) {
			var payload = {
				'id': appid,
				'version': appversion,
				'instid': appinstid,
				'pcode': code
			};
			var cmd = this.create(Documa.communication.MessageFieldValues.SYS_LEVEL,
				Documa.communication.commands.SystemCommands.PAUSEAPP, payload);
			return cmd;
		},
		
		/**
		 * Creates a command for resuming application from its current lifecycle state.
		 *
		 * @param {String} appid id of current application
		 * @param {String} appversion version of current application
		 * @param {String} appinstid server-side unique instance id of application
		 * @returns {Documa.communication.commands.Command}
		 */
		createApplicationResumeCommand: function(appid, appversion, appinstid) {
			var payload = {
				'id': appid,
				'version': appversion,
				'instid': appinstid
			};
			var cmd = this.create(Documa.communication.MessageFieldValues.SYS_LEVEL, Documa.communication.commands.SystemCommands.RESUMEAPP, payload);
			return cmd;
		},
		
		/**
		 * Creates a command object representing the selected distribution target. After
		 * receiving the command the server should use the mark the selected runtime
		 * as target context and proceed with the component integration process.
		 *
		 * @param {String} appid application's id
		 * @param {String} appversion application's version number
		 * @param {String} appinstid application's instance id
		 * @param {String} distid id of distribution item
		 * @param {String} targetsid session id of selected distribution target
		 * @returns {Documa.communication.commands.Command}
		 */
		createSelectDistributionTargetCommand: function(appid, appversion, appinstid, distid, targetsid) {
			var payload = {
				app: {
					id: appid,
					version: appversion,
					instid: appinstid
				},
				target: {
					id: distid,
					sid: targetsid
				}
			};
			return this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
				Documa.communication.commands.ApplicationCommands.SELECTDIST, payload);
		},
		
		/**
		 * Creates a command for closing application with given parameters.
		 *
		 * @param {String} appid id of current application
		 * @param {String} appversion version of current application
		 * @param {String} appinstid server-side unique instance id of application
		 * @returns {Documa.communication.commands.Command}
		 */
		createApplicationCloseCommand: function(appid, appversion, appinstid) {
			var payload = {
				'id': appid,
				'version': appversion,
				'instid': appinstid
			};
			var cmd = this.create(Documa.communication.MessageFieldValues.SYS_LEVEL,
				Documa.communication.commands.SystemCommands.CLOSEAPP, payload);
			return cmd;
		},
		
		/**
		 * Creates a request command to integrate the set of specified components.
		 *
		 * @param {String} appid id of current application
		 * @param {String} appversion version of current application
		 * @param {String} appinstid server-side unique instance id of application
		 * @param {Documa.distribution.DistributionModification} distmod distribution state modifications
		 * @returns {Documa.communication.commands.Command}
		 */
		createDistributionChangeRequest: function(appid, appversion, appinstid, distmod) {
			var comps = new Array();
			for(var i = 0; i < distmod.getComponents().length; ++i) {
				var item = distmod.getComponents()[i];
				if(!( item instanceof Documa.distribution.ComponentItem))
					throw new Error("Invalid component item detected!");
				// prepare for serialization
				comps.push({
					component: item.getComponentId(),
					instance: item.getInstanceId()
				});
			}
			var payload = {
				id: appid,
				version: appversion,
				instid: appinstid,
				modid: distmod.getId(),
				type: distmod.getType(),
				target: distmod.getTarget(),
				components: comps
			};
			return this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
				Documa.communication.commands.ApplicationCommands.REQUESTDIST_MOD, payload);
		},
		/**
		 * Creates and returns START MIGRATION command to trigger a server-side coordinated migration transaction.
		 *
		 * @param {String} appid id of current application
		 * @param {String} appversion version of current application
		 * @param {String} appinstid server-side unique instance id of application
		 * @param {Documa.distribution.migration.Migration} migration object aggregating several distribution state modifications
		 * @returns {Documa.communication.commands.Command}
		 */
		createStartMigrationCommand: function(appid, appversion, appinstid, migration) {
			// create payload object
			var payload = {
				id: appid,
				version: appversion,
				instid: appinstid,
				migration: migration.serializable()
			};
			return this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
				Documa.communication.commands.ApplicationCommands.STAR_MIGRATION, payload);
		},
		
		
		/**
		 * Creates a components search command.
		 *
		 * @param {string} query
		 * @param {boolean} isUi
		 * @param {number} maxComps maximal component limit
		 * @param {string} runtimeId
		 * @param {string} runtimeVersion
		 * @returns {Documa.communication.commands.Command}
		 */
		createSearchComponentsCommand: function(query, isUi, maxComps, runtimeId, runtimeVersion) {
			var uiText = ".";
			var limit = maxComps || 10;
			
			if(isUi) {
				uiText = '; mcdl:isUI true.';
			} else {
				uiText = '; mcdl:isUI false.';
			}
			
			var activity = query, entity = query;
			var _res = /(\w+)\s+(\w+)/.exec(query);
			
			if(_res != null && _res.length == 3) {
				activity = _res[1];
				entity = _res[2];
			}
			
			// @formatter:off
			// create sparql query for searching components
			var sparqlQuery =
				'PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> '+
				'PREFIX mcdl:<http://mmt.inf.tu-dresden.de/models/mcdl.owl#> '+
				'PREFIX bqe:<http://mmt.inf.tu-dresden.de/models/quality/property-base#> '+
				'PREFIX cqe:<http://mmt.inf.tu-dresden.de/models/quality/property-component#> '+
				'PREFIX owl:<http://www.w3.org/2002/07/owl#> '+
				'PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> ' +
				'SELECT DISTINCT ?id ?name ?url ?docu ' +
				'WHERE { ' +
					'?mcdl a mcdl:MashupComponent; ' +
						'mcdl:hasId ?id; ' +
						'mcdl:hasName ?name; ' +
						'mcdl:hasInterface ?if; ' +
						'mcdl:hasMetadata ?meta. ' +
					'OPTIONAL { ?mcdl mcdl:hasDocumentation ?docu. } ' +
					'OPTIONAL { ?meta bqe:hasIcon ?icon. ?icon cqe:hasImageURI ?url.} ' +
					'OPTIONAL { ' +
						'{ ' +
							'?if mcdl:hasOperation ?op. ' +
							'?op mcdl:hasCapability ?cap. ' +
							'?cap mcdl:hasActivity ?furi. ' +
							'?cap mcdl:hasEntity ?euri. ' +
						'} UNION { ' +
							'?mcdl mcdl:hasCapability ?cap. ' +
							'?cap mcdl:hasActivity ?furi. ' +
							'?cap mcdl:hasEntity ?euri. ' +
						'} ' +
					'} ' +
					'?mcdl mcdl:hasBinding ?b. ' +
					'?b mcdl:hasRuntime ?rt. ' +
					'?rt mcdl:hasId ?rtid; mcdl:hasVersion ?v. ' +
					'FILTER(REGEX(?rtid, "' + runtimeId + '", "i") && mcdl:versionMatches("' + runtimeVersion + '",?v)) ' +
					'OPTIONAL {' +
						'?meta bqe:hasKeywords ?kws. ' +
						'?kws cqe:hasKeyword ?kw. ' +
					'} ' +
					'FILTER(REGEX(?furi, "' + activity + '", "i") || ' +
						'REGEX(?euri, "' + entity + '", "i")||' +
						'REGEX(?kw, "' + entity + '|' + activity + '", "i") || ' +
						'REGEX(?name, "' + entity + '|' + activity + '", "i")' + ')' +
				'} ORDER BY ASC(?name) LIMIT ' + limit;
			// @formatter:on
			
			var payload = {
				query: sparqlQuery
			};
			
			return this.create(Documa.communication.MessageFieldValues.SYS_LEVEL,
				Documa.communication.commands.SystemCommands.SEARCHCORE, payload);
		},
		
		/**
		 * Creates an executable command.
		 * @param {Documa.communication.Message} message object encapsulating command information.
		 * @returns {Documa.communication.commands.ExecutableCommand}
		 */
		createExecutable: function(message) {
			var cmd = null;
			if(!message instanceof Documa.communication.Message)
				throw new Error("Could not create executable command because of invalid arguments");
			switch (message.getMessageTag()) {
				case Documa.communication.commands.SystemCommands.SHOWAPPS:
					cmd = new Documa.communication.commands.ShowAppCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.INTEGRRES:
					cmd = new Documa.communication.commands.IntegrateResourcesCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.INTEGRCOMP:
					cmd = new Documa.communication.commands.IntegrateComponentCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.NOCHANNEL:
					cmd = new Documa.communication.commands.NoChannelCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.ADDCHANNEL:
					cmd = new Documa.communication.commands.AddChannelCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.INITSTATE:
					cmd = new Documa.communication.commands.InitialStateTransitionCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.LAYOUT:
					cmd = new Documa.communication.commands.LayoutCommand(message);
					break;
				case Documa.communication.commands.ApplicationCommands.CHOICEDIST:
					cmd = new Documa.communication.commands.ChoiceDistCommand(message);
					break;
				case Documa.communication.commands.ApplicationCommands.CPUBLISH:
					cmd = new Documa.communication.commands.ComponentMessagePublishCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.SETPROPERTY:
					cmd = new Documa.communication.commands.SetPropertyMessageCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.UPDATEBUDDIES:
					cmd = new Documa.communication.commands.UpdateBuddyListMessageCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.SEARCHCORE:
					cmd = new Documa.communication.commands.SearchCoReCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.SHOWSEARCHRESULTS:
					cmd = new Documa.communication.commands.ShowSearchResultsCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.LOGIN:
					cmd = new Documa.communication.commands.LoginCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.GETPROPERTIES:
					cmd = new Documa.communication.commands.GetPropertiesMessageCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.UPDATERIGHT:
					cmd = new Documa.communication.commands.UpdateRightCommand(message);
					break;
				case Documa.communication.commands.Commands.REQRUNTIME:
					cmd = new Documa.communication.commands.RuntimeRequestCommand(message);
					break;
				case Documa.communication.commands.SystemCommands.INTTRIGGER:
					cmd = new Documa.communication.commands.IntegrateTriggerCommand(message);
					break;
				case Documa.communication.commands.ApplicationCommands.PUBLISHRECOMMENDATION:
					cmd = new Documa.communication.commands.PublishRecommendationCommand(message);
					break;
				case Documa.communication.commands.ApplicationCommands.UPDATEMIGRATIONPROGRESS:
					cmd = new Documa.communication.commands.UpdateMigrationProgressCommand(message);
					break;
				
				/////////////////////////////////////////////////////////
				/* TODO: create additional command implementation here */
				/////////////////////////////////////////////////////////
			}
			return cmd;
		}
	};
})());
