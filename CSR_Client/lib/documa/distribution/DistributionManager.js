Ext.namespace('Documa.distribution');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.util.TestUtil');

Documa.require('Documa.ui.distribution.ChoiceDistributionView');
Documa.require('Documa.ui.distribution.DistributionView');
Documa.require('Documa.distribution.DistributionUpdate');

Documa.require('Documa.communication.protocol.RuntimeRequestResponse');
Documa.require('Documa.communication.commands.CommandFactory');
Documa.require('Documa.communication.events.EventFactory');
Documa.require('Documa.components.ComponentInterface');

Documa.require('Documa.distribution.ComponentItem');
Documa.require('Documa.distribution.DistributionModification');
Documa.require('Documa.distribution.transaction.PrepareResponse');
Documa.require('Documa.distribution.transaction.CommitResponse');
Documa.require('Documa.distribution.transaction.CancelResponse');
Documa.require('Documa.distribution.migration.MigrationStateInjector');
Documa.require("Documa.distribution.migration.options.MigrationOption");

/**
 * @callback PrepareResponseCallback
 * @param {Documa.distribution.transaction.PrepareResponse}
 */

/**
 * @callback CommitResponseCallback
 * @param {Documa.distribution.transaction.CommitResponse}
 */

/**
 * @callback CancelResponseCallback
 * @param {Documa.distribution.transaction.CancelResponse}
 */

/**
 * @typedef {Object} DistributionChangePayload
 * @property {Array.<ComponentItemType>} components
 * @property {string} modification
 * @property {string} distid
 */

Documa.distribution.RuntimeRoles = {
	Source: "source",
	Target: "target"
};

Documa.distribution.PrepareCodes = {
	ALL_COMPONENTS_READY: 800,
	ALL_COMPONENTS_EXECUTABLE: 801,
	NOTALL_COMPONENTS_READY: 802,
	NOTALL_COMPONENTS_EXECUTABLE: 803,
	MIGRATION_CANCELLED_BYUSER: 804,
	// TODO: add further codes here
	NO_COMPONENT_EXECUTABLE: 810
};

/**
 * This class encapsulates the application's distribution space.
 * @class
 * @extends {Documa.communication.protocol.RuntimeRequestResponse}
 */
Documa.distribution.DistributionManager = Ext.extend(Documa.communication.protocol.RuntimeRequestResponse, (function() {
	const TAG = 'Documa.distribution.DistributionManager';
	const LOG = Documa.util.Logger;
	const UTIL = Documa.util.Util;
	const jq = jQuery;
	
	
	/**
	 * Helper method to serialize given array of input events.
	 *
	 * @param {Array} events each event is typed as {Documa.components.ComponentInputEvent}
	 * @return {String}
	 */
	function serializeInputEvents(events) {
		let resultSet = [];
		for(let i = 0; i < events.length; ++i) {
			// add current event in json format into
			// the result set
			resultSet.push(events[i].serialize());
		}
		return JSON.stringify(resultSet);
	}
	
	/**
	 * Returns an object containing important information from
	 * the component descriptor used to visualize a component on
	 * ui layer.
	 *
	 * @param {String} instid component's instance id
	 * @param {String} cid component id
	 * @param {Element} smcd component descriptor object
	 * @returns {Documa.distribution.ComponentItem} item
	 *         describing component instance
	 */
	function getComponentInformation(instid, cid, smcd) {
		// TODO: extract component id and title
		// TODO: extract capabilities of each interface element
		// and present them on ui
		let citem = new Documa.distribution.ComponentItem({
			cid: cid,
			id: instid,
		});
		citem.setSmcd(smcd);
		// getting all component capabilities
		let capabilities = smcd.querySelectorAll("capability");
		
		// getting capability context
		// 1st test parent of capability
		// 1.1 parent is the component
		// 1.2 parent is an operation
		
		if(!capabilities) {
			LOG.debug(TAG, "... component descriptor has capability description!");
			return null;
		}
		if(capabilities.length > 0) {
			// display capabilities as part of the component
			// representation on ui layer
			for(let i = 0; i < capabilities.length; ++i) {
				let operationName = null;
				
				// TODO: get component operation name
				if(!capabilities[i].parentNode)
					throw new Error("Capability has no parent node! Invalid smcdl document found!");
				
				if(capabilities[i].parentNode.localName === "operation") {
					// capability element is a child of an
					// operation
					operationName = capabilities[i].parentNode.getAttribute("name");
				}
				// create item describing capability
				citem.addCapability(capabilities[i].getAttribute("activity"), capabilities[i].getAttribute("entity"), operationName);
			}
		} else {
			LOG.debug(TAG, "... no capabilities in descriptor of component {" + cid + "} defined!");
		}
		return citem;
	}
	
	/**
	 * Returns collection of unknown components.
	 * @param {Array.<Documa.distribution.ComponentItem>} components
	 * @returns {Array.<Documa.distribution.ComponentItem>}
	 */
	function getUnknownComponents(components) {
		let unknownComponents = [];
		let componentManager = Documa.RuntimeManager.getComponentManager();
		// 3rd the components set can contain components, which
		// are unknown from the perspective of the current runtime context --> they
		// where never integrated before and the component manager could not provide a
		// corresponding set of component descriptors
		for(let i = 0; i < components.length; ++i) {
			// getting descriptor for each component
			let container = componentManager.getContainerElementById(components[i].getInstanceId());
			if(!container) {
				// component manager could determine local
				// component container --> component must be
				// executed remotely push component id into list
				// of unknown
				// components, so they can be requested later
				unknownComponents.push(components[i]);
			}
		}
		return unknownComponents;
	}
	
	/**
	 * Adds distribution instance onto the presentation layer.
	 * It represents the distribution of a specific component
	 * set to a runtime context (device). The component set
	 * could reference component instances, which were never
	 * integrated into the current runtime context, i. e. the
	 * client-side component manager cannot provide any
	 * descriptor information of all components. Thus, the
	 * distribution manager can request the server-side
	 * counterpart to retrieve component descriptors from
	 * unknown component instances.
	 *
	 * @param {Documa.distribution.Distribution} distribution object representing the mapping
	 *            between a specific component set and a runtime
	 *            context/device
	 */
	function addDistribution(distribution) {
		// can contain unknown components
		let unknownComponents = [];
		// can contain entities including component information
		// for presenting them on ui layer
		let componentEntities = [];
		
		// 1st clear the devices and components store
		// 2nd search for the device instance that has the same
		// session id specified in
		// the current distribution item
		// add device instance into the devices store
		let device = this.getDevice(distribution.getSessionId());
		if(!device)
			throw new Error("Could not determine device from session id: " + distribution.getSessionId());
		
		// create an internal representation of the distribution
		let components = distribution.getComponents();
		let componentManager = Documa.RuntimeManager.getComponentManager();
		// 3rd the components set can contain components, which
		// are unknown from the perspective of the current runtime context --> they
		// where never integrated before and the component manager could not provide a
		// corresponding set of component descriptors
		for(let i = 0; i < components.length; ++i) {
			// getting descriptor for each component
			// let descriptor =
			// componentManager.getComponentDescriptor(components[i].componentid);
			// getting container from instance id
			let container = componentManager.getContainerElementById(components[i].getInstanceId());
			if(!container) {
				// component manager could determine local
				// component container --> component must be
				// executed remotely push component id into list
				// of unknown
				// components, so they can be requested later
				unknownComponents.push(components[i]);
			} else {
				// getting component information element to
				// represent it on ui layer
				let instid = container.getComponentInstanceID();
				let cid = container.getComponentID();
				let smcd = container.getDescriptor();
				let citem = getComponentInformation.call(this, instid, cid, smcd);
				// register component item for later migration
				// processes
				this._componentItems[instid] = citem;
				componentEntities.push(citem);
			}
		}
		// known components were added to list of component
		// entities
		if(componentEntities.length > 0) {
			// visualize distribution information on ui layer
			this._distributionView.showDistribution(device, componentEntities);
		}
		return unknownComponents;
	}
	
	/**
	 * Helper method to create migration response instance.
	 *
	 * @param {Object} response payload object containing migration response parameters
	 * @return {Documa.distribution.transaction.PrepareResponse}
	 */
	function createMigrationResponse(response) {
		if(!response.code)
			throw new Error("No migration response code defined!");
		if(!response.execmap)
			throw new Error("No execution map of migrating component instances defined!");
		if(!response.description)
			throw new Error("No migration response description defined!");
		if(!response.mid)
			throw new Error("No migration id in migration response defined!");
		return new Documa.distribution.transaction.PrepareResponse(response.tid, response.code, response.description, response.execmap);
	}
	
	/**
	 * Helper method to start migration prepare request that will be send to target runtime.
	 *
	 * @param {Documa.distribution.Device} targetDevice device that should execute set of components
	 * @param {Array} components set of migrating components
	 * @param {Function} successCb callback is executed after a positive migration response was received
	 * @param {Function} errorCb callback is executed after an error occured during migration prepare-request
	 */
	function requestPrepareMigration(targetDevice, components, successCb, errorCb) {
		let cidarray = [];
		// transforming components argument
		for(let i = 0; i < components.length; ++i) {
			cidarray.push({
				instance: components[i].getInstanceId(),
				component: components[i].getComponentId()
			});
		}
		
		// determine parameters for migration prepare-request
		let action = Documa.communication.commands.RequestActions.PREP_MIGRATE;
		let params = {
			modifications: [
				{
					target: targetDevice.getSessionId(),
					components: cidarray,
					type: Documa.distribution.DistributionModificationTypes.ADD
				}
			]
		};
		
		// calling super class to perform the request-response protocol between this and
		// the target runtime
		this.doRequest(action, params, [targetDevice.getSessionId()], function(response) {
			// *************************************************************************
			// migration success callback --> received response from target successfully
			// *************************************************************************
			LOG.debug(TAG, "... received migration request runtime response successfully!");
			// create migration response object from response payload
			let migrationResp = createMigrationResponse(response.getResponsePayload());
			successCb(migrationResp);
			// eof migration success callback *****************************************
		}, function(response) {
			// *************************************************************************
			// migration error callback ************************************************
			// *************************************************************************
			LOG.warn(TAG, "... failure during migration request!");
			// create migration response object from response payload
			let migrationResp = createMigrationResponse(response.getResponsePayload());
			errorCb(migrationResp);
			// eof migration error callback ********************************************
		});
	}
	
	/**
	 * Send commit request to perform the migration all specified components to given target runtime.
	 * Each component is represented by its managing container that provides access to the extracted state data.
	 *
	 * @param {String} mid
	 *                            id of migration process determined on server-side during the prepare
	 *                            phase
	 * @param {Documa.distribution.Device} targetDevice device that should execute set of components
	 *
	 *                            structure of state entity
	 *                                <instid>: {
	 *									checkpoint : <Documa.components.Checkpoint>
	 *									events : <array>
	 * 								}
	 *
	 * @param {Object} cmpStateEntities
	 *                            map of component state entities representing migrating components
	 *                            and their current state information
	 * @param {Function} successCb
	 *                            callback is executed after a positive migration response was
	 *                            received
	 * @param {Function} errorCb
	 *                            callback is executed after an error occured during migration
	 *                            prepare-request
	 */
	function requestCommitMigration(mid, targetDevice, cmpStateEntities, successCb, errorCb) {
		let action = Documa.communication.commands.RequestActions.CMIT_MIGRATE;
		
		let params = {
			mid: mid,
			states: []
		};
		
		// serialize state data
		for(let instid in cmpStateEntities) {
			let events = [];
			for(let i = 0; i < cmpStateEntities[instid].events.length; ++i) {
				let evt = cmpStateEntities[instid].events[i];
				if(!(evt instanceof Documa.components.ComponentInputEvent)) {
					throw new Error("Invalid event during COMMIT MIGRATION request detected!");
				}
				events.push(evt.serialize());
			}
			// create serializable state item
			// and add it into state set
			params.states.push({
				cinstance: instid,
				checkpoint: cmpStateEntities[instid].checkpoint.serialize(),
				events: events
			});
		}
		
		// request target device to commit migration of several components
		this.doRequest(action, params, [targetDevice.getSessionId()], function(response) {
			// request was handled and a response was received successfully
			LOG.debug(TAG, "... received a response from the COMMIT MIGRATION request!");
			throw new Error("Not implemented yet!");
		}, function(response) {
			LOG.error(TAG, "... an error occurred during the COMMIT MIGRATION request!");
			// error occurred during the request
			throw new Error("Not implemented yet!");
		});
	}
	
	/**
	 * Validation of event's structure.
	 *
	 * @param {Documa.communication.events.ApplicationEvent} changeEvent event to be analyzed
	 * @returns {void}
	 */
	function validateDistributionChangeEvent(changeEvent) {
		let payload = changeEvent.getPayload();
		if(!payload)
			throw new Error("No payload in distribution change event defined!");
		if(!payload.distid)
			throw new Error("No distribution element id in distribution change event defined!");
		if(!payload.components)
			throw new Error("No set of components in distribution change event defined!");
		if(!payload.modification)
			throw new Error("No modification description in distribution change event defined!");
	}
	
	/**
	 * Validation of event's expected structure.
	 *
	 * @param {Documa.communication.events.ApplicationEvent} transactionCompleted
	 */
	function validateTransactionCompletedEvent(transactionCompleted) {
		let payload = transactionCompleted.getPayload();
		if(!payload)
			throw new Error("No payload in migration completed event defined!");
		if(!payload.tid)
			throw new Error("No migration id in migration completed event defined!");
	}
	
	/**
	 * Creates and sends start migration commmand to serverside distribution manager
	 * that takes over the migration coordination
	 *
	 * @param {Documa.distribution.migration.Migration} migration object aggregating
	 *                            several distribution state modifications
	 */
	function startMigration(migration) {
		if(!(migration instanceof Documa.distribution.migration.Migration))
			throw new Error("Invalid migration argument!");
		
		LOG.debug(TAG, "... triggering remote coordinated migration transaction.");
		let appid = this._appContext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
		let appinstid = this._appContext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
		let appversion = this._appContext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
		
		// create command from migration object
		let cmd = this._cfactory.createStartMigrationCommand(appid, appversion, appinstid, migration);
		Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(cmd);
	}
	
	/**
	 * Returns serializable representation of given object of component states.
	 *
	 * @param {Object} componentStates object containing state object for each component state
	 * @returns {Array} array of component states
	 */
	function getSerializableComponentStates(componentStates) {
		let states = [];
		// serialize state data
		for(let instid in componentStates) {
			let events = [];
			for(let i = 0; i < componentStates[instid].events.length; ++i) {
				let evt = componentStates[instid].events[i];
				if(!(evt instanceof Documa.components.ComponentInputEvent)) {
					throw new Error("Invalid event during COMMIT MIGRATION request detected!");
				}
				events.push(evt.serialize());
			}
			// create serializable state item
			// and add it into state set
			states.push({
				cinstance: instid,
				checkpoint: componentStates[instid].checkpoint.serialize(),
				events: events
			});
		}
		
		return states;
	}
	
	/**
	 * Returns deserialized array of component states.
	 *
	 * @param {Array} componentStates array of component states
	 */
	function deserializeComponentState(componentStates) {
		if(!(componentStates instanceof Array))
			throw new Error("Invalid array of component states specified!");
		
		for(let i = 0; i < componentStates.length; ++i) {
			let state = componentStates[i];
			
			// replace string representation with object representation
			state.checkpoint = JSON.parse(state.checkpoint);
			
			if(!(state.events instanceof Array))
				throw new Error("Invalid array of events in state object defined!");
			
			for(let j = 0; j < state.events.length; ++j) {
				// replace string representation with object representation
				state.events[j] = JSON.parse(state.events[j]);
			}
		}
		
		return componentStates;
	}
	
	/**
	 * Analyze validity of current delivery context:
	 * a) Are there enough processor,
	 * b) energy and
	 * c) memory resources available to execute all requested components?
	 *
	 * @param {Documa.distribution.migration.MigrationPrepareRequest|
	 *         Documa.distribution.realization.RealizationPrepareRequest} request
	 *                        request object including migration prepare request parameters,
	 *                        e.g. component ids and states for integration
	 * @returns {object.<string, boolean>} execmap describing the executability of each component
	 */
	function analyzeContextValidity(request) {
		let execmap = {};
		/** @type {Array.<Documa.distribution.DistributionModification>} */
		let modifications = null;
		if(request instanceof Documa.distribution.migration.MigrationPrepareRequest) {
			modifications = request.getModifications();
		} else if(request instanceof Documa.distribution.realization.RealizationPrepareRequest) {
			modifications = request.getRealization().getModifications();
		} else {
			throw new Error("Current request object is not supported!");
		}
		if(!modifications) {
			throw new Error("Invalid modification array!");
		}
		// ****************************************************************
		// TODO: implement here a sophisticated context analysis algorithm,
		// e. g. checking available energy, processor, memory resources etc.
		// ****************************************************************
		/*!just a trivial work arround!*/
		for(let i = 0; i < modifications.length; ++i) {
			let modification = modifications[i];
			let components = modification.getComponents();
			for(let i = 0; i < components.length; ++i) {
				// mark each component as executable
				execmap[components[i].instance] = true;
			}
		}
		return execmap;
	}
	
	/**
	 * Returns array of associated downstream events from given component's instance id.
	 *
	 * @param {String} instid component's instance id
	 * @param {Array.<Object.<string, array>>} downstreamEvents array of downstream events
	 * @returns {Array}
	 */
	function getDownstreamEventsFromComponent(instid, downstreamEvents) {
		for(let j = 0; j < downstreamEvents.length; ++j) {
			let eventObject = downstreamEvents[j];
			
			// validating event descriptor structure
			if(!eventObject.cinstance)
				throw new Error("Missing component instance in downstream events descriptor object!");
			
			if(!eventObject.events)
				throw new Error("Missing array of downstream events for component: " + eventObject.cinstance);
			
			if(eventObject.cinstance === instid) {
				let devents = [];
				for(let i = 0; i < eventObject.events.length; ++i) {
					devents.push(JSON.parse(eventObject.events[i]));
				}
				return devents;
			}
		}
		return null;
	}
	
	
	/**
	 * Initialize a distribution object using the specified device.
	 *
	 * @param {Documa.distribution.Device} device
	 * @returns {String}
	 */
	function initDistribution(device) {
		let distribution = this.getDistributionFromDevice(device);
		if(!distribution) {
			// create a distribution object for each unknown device
			distribution = UTIL.createDistribution(device);
			this._distributionSet.push(distribution);
			
			// register distribution changed listener to represent the new distribution state on metaui
			// layer
			distribution.addListener(Documa.distribution.DistributionEvents.CHANGED, onDistributionChanged.bind(this));
		}
		return distribution.getId();
	}
	
	/**
	 * Removes distribution with given target device from internal distribution set.
	 * @param {Documa.distribution.Device} device
	 */
	function removeDistribution(device) {
		let distribution = this.getDistributionFromDevice(device);
		if(!distribution)
			throw new Error("Could not retrieve distribution object from device " + device.getSessionId());
		
		let dindex = this._distributionSet.indexOf(distribution);
		if(dindex < 0)
			throw new Error("Could not remove distribution object.");
		
		// remove distribution from current distribution set
		UTIL.remove(dindex, this._distributionSet);
	}
	
	
	/**
	 * Helper method for creating a matching distributin instance from given modification descriptor.
	 * @param {Documa.distribution.DistributionModification} modification
	 * @returns {Documa.distribution.Distribution}
	 */
	function createDistributionFromModification(modification) {
		/** @type {Array.<{cid:string, id:string}} */
		let components = modification.getComponents().map(function(citem) {
			return {
				cid: citem.getComponentId(),
				id: citem.getInstanceId()
			};
		});
		// creating a distribution value object
		let distObj = {
			sid: modification.getTarget(),
			distid: modification.getId(),
			cmpset: components
		};
		return new Documa.distribution.Distribution(distObj);
	}
	
	/**
	 * Called after the given distribution was changed, i. e. when components were added or removed.
	 * @param {Documa.distribution.Distribution} distribution
	 */
	function onDistributionChanged(distribution) {
		try {
			let metaui = Documa.RuntimeManager.getUIManager().getMetaUIController();
			let promise = metaui.getMetaUIView().whenReady();
			if(promise.fulfilled) {
				metaui.getMetaUIView().distributionChanged(distribution);
			} else {
				promise.then(function() {
					metaui.getMetaUIView().distributionChanged(distribution);
				}).catch(function(error) {
					LOG.error(TAG, error.stack);
				});
			}
		} catch (error) {
			LOG.error(TAG, error.stack);
			Documa.RuntimeManager.getUIManager().showError(error.toString());
		}
	}
	
	/**
	 * Helper method requesting and returning the migration options.
	 *
	 * @param {String} sourceClient
	 * @returns {Promise.<Object>}
	 */
	function requestMigrationOptions(sourceClient) {
		// TODO: dummy implementation for testing purposes
		return Documa.util.TestUtil.requestMigrationOptions();
	}
	
	// **************************************************************
	// public methods ***********************************************
	// **************************************************************
	return {
		/**
		 * Constructor.
		 * @constructs
		 * @param {Documa.context.ApplicationContext} applicationContext context of current application
		 */
		constructor: function(applicationContext) {
			Documa.distribution.DistributionManager.superclass.constructor.call(this);
			
			// view to configure the initial application
			// distribution state
			this._choiceview = new Documa.ui.distribution.ChoiceDistributionView(this);
			
			// view to present and configure the current
			// application distribution state
			//this._distributionView = new Documa.ui.distribution.DistributionView(this);
			
			// map of component item entries (instid,
			// Documa.distribution.ComponentItem)
			this._componentItems = {};
			
			// map of potential distribution options -->
			// presented during the application loading phase
			this._distributionOptionSet = {};
			
			/**
			 * array of current distribution items --> global application distribution state
			 * @type {Array<Documa.distribution.Distribution>}
			 * @private
			 */
			this._distributionSet = [];
			
			// map containing potential distributions, it
			// doesn't represent the application's current
			// distribution state
			this._potentialDistributions = {};
			
			
			/**
			 * temporary distribution modification array
			 * @type {Array.<Documa.distribution.DistributionModification>}
			 * @private
			 */
			this._preparingModifications = [];
			
			/**
			 * array of current devices registered within the application's context
			 * @type {Object.<string, Documa.distribution.Device>}
			 * @private
			 */
			this._devicesSet = {};
			
			// holds reference to description of current device
			this._currentDevice = null;
			
			/**
			 * map holding entries for each active migration
			 * @type {object.<string, Documa.distribution.migration.MigrationPrepareRequest>}
			 * @private
			 */
			this._migrationHistory = {};
			
			/**
			 * map holding entries for each active distribution state realization
			 * @type {object.<string, Documa.distribution.realization.RealizationPrepareRequest>}
			 * @private
			 */
			this._realizationHistory = {};
			
			// collection of remote component descriptors
			// aggregate during the synchronization of the
			// application's distribution state
			this._remoteDescriptors = {};
			
			// map contains object containing callback functions,
			// which should be called after a response event was
			// received
			this._migrationRequestRegistry = {};
			
			// contains mapping entries and each represents the assignment between a device and a distribution vector
			// that includes executable, non-executable and replaceable components with respect to the corresponding
			// device
			this._distributionVectorSet = {};
			/**
			 * meta ui controller to manipulate an application-specific distibution
			 * @type {Documa.ui.meta.MetaUIController}
			 * @private
			 */
			this._metauiController = Documa.RuntimeManager.getUIManager().getMetaUIController();
			
			// reference to current application context
			//
			this._appContext = applicationContext;
			
			/**
			 * @type {object.<string, Documa.distribution.DistributionUpdate>}
			 * @private
			 */
			this._distributionChanges = {};
			
			/**
			 * @type {Function}
			 * @private
			 */
			this._deviceAdded = null;
			
			// init message factories
			this._cfactory = new Documa.communication.commands.CommandFactory();
			this._efactory = new Documa.communication.events.EventFactory();
		},
		
		/**
		 * Array of temporary modifications.
		 * @returns {Array.<Documa.distribution.DistributionModification>}
		 */
		getPreparingModifications: function() {
			return this._preparingModifications;
		},
		
		/**
		 * Returns a distribution state element by its id.
		 * @param {String} id application wide unique identifier
		 * @returns {Documa.distribution.Distribution}
		 */
		getDistribution: function(id) {
			for(let i = 0; i < this._distributionSet.length; ++i) {
				let cur_dist = this._distributionSet[i];
				if(id === cur_dist.getId())
					return cur_dist;
			}
			return null;
		},
		
		/**
		 * Returns corresponding distribution object from specified device.
		 * @param {Documa.distribution.Device} device
		 * @returns {Documa.distribution.Distribution}
		 */
		getDistributionFromDevice: function(device) {
			for(let distribution of this._distributionSet) {
				if(distribution.getSessionId() === device.getSessionId()) {
					return distribution;
				}
			}
			return null;
		},
		
		/**
		 * @returns {Array.<Documa.distribution.Distribution>}
		 */
		getDistributions: function() {
			return this._distributionSet;
		},
		
		/**
		 * Returns distribution view showing application's
		 * distribution state.
		 *
		 * @return {Documa.ui.distribution.DistributionView}
		 */
		getDistributionView: function() {
			return this._distributionView;
		},
		/**
		 * Let the user select the distribution target defined
		 * within the specified distribution option object.
		 *
		 * @param {Documa.distribution.DistributionOption} distoption object describing the
		 *            distribution of a set of mashup components
		 *            to a specific target runtime environment
		 */
		addSelectableDistribution: function(distoption) {
			LOG.debug(TAG, "... showing potential distribution targets");
			this._distributionOptionSet[distoption.getId()] = distoption;
			this._choiceview.appendDistribution(distoption);
			this._choiceview.show();
		},
		
		/**
		 * Triggers a request to update the applications distribution state on server-side. After the distribution state
		 * representation was modified, each client received a distribution state change event to synchronize the
		 * distribution state on each participating device.
		 * @param {Documa.distribution.DistributionModification} modification
		 * @return {Promise}
		 */
		requestDistributionUpdate: function(modification) {
			let self = this;
			return new Promise(function(resolve, reject) {
				let appid = self._appContext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
				let appversion = self._appContext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
				let appinstid = self._appContext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
				
				let distributionStateUpdate = new Documa.distribution.DistributionUpdate(modification);
				distributionStateUpdate.setSuccessCallback(function(distribution) {
					// distribution state was updated successfully
					resolve(distribution);
				});
				
				distributionStateUpdate.setErrorCallback(function(error) {
					// error during distribution state update
					reject(error);
				});
				self._distributionChanges[modification.getId()] = distributionStateUpdate;
				
				// create distributions state change request message
				let command = self._cfactory.createDistributionChangeRequest(appid, appversion, appinstid, modification);
				Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(command);
			});
		},
		/**
		 * Updates current distribution set to represent the
		 * current application's distribution state on client
		 * side. Further, this method also updates the
		 * distribution state on ui layer with the help of the
		 * distribution view.
		 *
		 * @param {Array.<Documa.distribution.Distribution>} distributions array of several distribution
		 *            items transmitted by the server-side
		 *            distribution changed event
		 */
		updateDistributions: function(distributions) {
			LOG.debug(TAG, "... updating application's distribution state!");
			if(!(distributions instanceof Array))
				throw new Error("Invalid array of distribution items detected!");
			
			for(let i = 0; i < distributions.length; ++i) {
				let distribution = distributions[i];
				if(!(distribution instanceof Documa.distribution.Distribution))
					throw new Error("Invalid distribution description object found!");
				
				// register current distribution
				this._distributionSet.push(distribution);
				LOG.debug(TAG, "... extended distribution set!");
				
				// adding distribution
				let unknownComponents = addDistribution.call(this, distribution);
				if(unknownComponents.length > 0) {
					let device = this.getDevice(distribution.getSessionId());
					if(!device)
						throw new Error("Could not determine device from session id: " + distribution.getSessionId());
					let self = this;
					// start smcdl request here and define a
					// mechanism that forwards the response to a
					// defined response handler
					Documa.RuntimeManager.getComponentManager().requestRemoteDescriptors(unknownComponents, true, function(responseObject) {
						// ***********************************************************
						// handle descriptor request-response-object *****************
						// ***********************************************************
						LOG.debug(TAG, "... remote descriptors received successfully!");
						
						// collect and add
						// component information
						let componentEntities = new Array();
						let descriptorItems = responseObject.getDescriptorItems();
						for(let i = 0; i < descriptorItems.length; ++i) {
							let smcd = Ext.cruise.client.Utility.parseXMLFromString(descriptorItems[i].descr).querySelector("component");
							let cid = smcd.getAttribute("id");
							
							// register unknown component descriptor
							if(!self._remoteDescriptors[cid]) {
								LOG.debug(TAG, "... remote component descriptor {" + cid + "} registered!");
								self._remoteDescriptors[cid] = smcd;
							}
							
							for(let j = 0; j < descriptorItems[i].insts.length; ++j) {
								let instid = descriptorItems[i].insts[j];
								let citem = getComponentInformation.call(self, instid, cid, smcd);
								self._componentItems[instid] = citem;
								componentEntities.push(citem);
							}
						}
						
						// known components were
						// added to list of
						// component entities
						if(componentEntities.length > 0) {
							// visualize
							// distribution
							// information on ui
							// layer
							self._distributionView.showDistribution(device, componentEntities);
						}
					}, function(errorEvent) {
						// ***********************************************************
						// handle descriptor request error event *********************
						// ***********************************************************
						LOG.error(TAG, "... error during component descriptor occured!");
						throw new Error("Not implemented yet!");
					});
				}
			}
		},
		/**
		 * Synchronization of a specific distribution element addressed by the defined change event.
		 *
		 * @param {Documa.communication.events.ApplicationEvent} changeEvent
		 *                            change of a specific distribution state item
		 */
		updateSingleDistribution: function(changeEvent) {
			validateDistributionChangeEvent(changeEvent);
			/** @type {DistributionChangePayload} */
			let payload = changeEvent.getPayload();
			/** @type {Array.<{id:string, cid:string, interface:string}>} */
			let components = payload.components;
			let distid = payload.distid;
			// get array of component items
			let citems = [];
			for(let i = 0; i < components.length; ++i) {
				let c = new Documa.distribution.ComponentItem(components[i]);
				let ci = new Documa.components.ComponentInterface(components[i].interface);
				c.setName(ci.getName());
				c.setIcon(ci.getIcon());
				c.setSmcd(ci._interface[0]);
				citems.push(c);
			}
			
			LOG.debug(TAG, "... received distribution state change event");
			switch (payload.modification) {
				case Documa.distribution.DistributionModificationTypes.ADD: {
					let targetDist = this.getDistribution(distid);
					if(!targetDist)
						throw new Error("Could not determine distribution element from id: " + payload.distid);
					LOG.debug(TAG, "... adding components to distribution: " + targetDist.getId());
					// add components to the target distribution
					for(let i = 0; i < citems.length; ++i) {
						targetDist.addComponent(citems[i]);
						// update distribution view
						this._distributionView.addComponent(targetDist.getSessionId(), citems[i]);
					}
					break;
				}
				case Documa.distribution.DistributionModificationTypes.REM: {
					let targetDist = this.getDistribution(distid);
					if(!targetDist)
						throw new Error("Could not determine distribution element from id: " + payload.distid);
					LOG.debug(TAG, "... removing components from distribution: " + targetDist.getId());
					// remove components from the target distribution
					// add components to the target distribution
					for(let i = 0; i < citems.length; ++i) {
						targetDist.removeComponent(citems[i]);
						// update distribution view
						this._distributionView.removeComponent(targetDist.getSessionId(), citems[i].getInstanceId());
					}
					break;
				}
				case Documa.distribution.DistributionModificationTypes.CREATE: {
					let targetDist = this.getDistribution(distid);
					if(targetDist) {
						// get optional distribution update callback functions
						let distributionUpdate = this._distributionChanges[targetDist.getId()];
						if(distributionUpdate) {
							distributionUpdate.getModification().getComponents().forEach(function(citem) {
								// TODO: get interface descriptor considering current component instance
								let match = payload.components.filter(function(cobj) {
									return (citem.getInstanceId() === cobj.id);
								})[0];
								if(!match) throw new Error("Missing interface descriptor.");
								console.debug(match);
								let ci = new Documa.components.ComponentInterface(match.interface);
								citem.setName(ci.getName());
								citem.setIcon(ci.getIcon());
								
								// test whether the target distribution was not modified during the config phase
								// on the distribution config device (application owner) the distribution were already
								// defined
								if(!targetDist.containsComponent(citem.getInstanceId(), citem.getComponentId())) {
									targetDist.addComponent(citem);
								}
							});
							// current distribution update was defined previously
							let successCallback = distributionUpdate.getSuccessCallback();
							successCallback.call(this, targetDist);
							// update capview if visible
							let uiManager = Documa.RuntimeManager.getUIManager();
							if(uiManager.getActiveView() === uiManager.getCapView()) {
								uiManager.getCapView().compileView();
							}
						} else {
							citems.forEach(function(c) {
								if(targetDist.containsComponent(c.getInstanceId(), c.getComponentId()))
									return;
								// add new component
								targetDist.addComponent(c);
							});
							let self = this;
							let unknown = getUnknownComponents.call(this, targetDist.getComponents());
							if(unknown.length > 0) {
								Documa.RuntimeManager.getComponentManager().requestRemoteDescriptors(unknown, true, function(responseObject) {
									// ***********************************************************
									// handle descriptor request-response-object *****************
									// ***********************************************************
									LOG.debug(TAG, "... remote descriptors received successfully!");
									// collect and add component information
									let componentEntities = [];
									let descriptorItems = responseObject.getDescriptorItems();
									for(let i = 0; i < descriptorItems.length; ++i) {
										let smcd = Ext.cruise.client.Utility
											.parseXMLFromString(descriptorItems[i].descr)
											.querySelector("component");
										let cid = smcd.getAttribute("id");
										// register unknown component descriptor
										if(!self._remoteDescriptors[cid]) {
											LOG.debug(TAG, "... remote component descriptor {" + cid + "} registered!");
											self._remoteDescriptors[cid] = smcd;
										}
									}
								}, function(errorEvent) {
									// ***********************************************************
									// handle descriptor request error event *********************
									// ***********************************************************
									LOG.error(TAG, "... error during component descriptor occured!");
									throw new Error("Not implemented yet!");
								});
							}
							
							// update capview if visible
							let uiManager = Documa.RuntimeManager.getUIManager();
							if(uiManager.getActiveView() === uiManager.getCapView()) {
								uiManager.getCapView().compileView();
							}
						}
						return;
					}
				}
			}
		},
		
		forwardMigrationOptions: function() {
			Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage()
		},
		/**
		 * Maps potential distribution to specified device. The
		 * potential distribution of a device describes the set
		 * of mashup components that are executable within the
		 * runtime context represented by the given device.
		 *
		 * @param {Documa.distribution.Device} device entity representing the current or
		 *            a remote runtime context
		 * @param {Documa.distribution.Distribution} distribution object includes components,
		 *            which could be executed by given device
		 */
		updatePotentialDistribution: function(device, distribution) {
			if(device.getSessionId() !== distribution.getSessionId()) {
				throw new Error("Could not map device {" + device.getSessionId() + "} to potential distribution!");
			}
			
			// check if there is already a distribution
			// registered for the given device
			let sid = device.getSessionId();
			if(!this._potentialDistributions[sid]) {
				LOG.debug(TAG, "... registered new potential distribution of session {" + sid + "}");
				// no distribution object for current device
				// registered
				this._potentialDistributions[sid] = distribution;
			} else {
				LOG.debug(TAG, "... merge components into existing potential distribution entity!");
				// there is already a potential distribution -->
				// create union of both components sets
				let pdistribution = this._potentialDistributions[sid];
				let checklist = {};
				
				// get those components which are not included
				// in the existing
				// distribution description
				for(let i = 0; i < distribution.getComponents().length; ++i) {
					let c1 = distribution.getComponents()[i];
					checklist[c1] = false;
					for(let j = 0; j < pdistribution.getComponents().length; ++j) {
						let c2 = pdistribution.getComponents()[j];
						if(c1.getInstanceId() === c2.getInstanceId() && c1.getComponentId() === c2.getComponentId()) {
							// mark current component --> there
							// is match in existing distribution
							checklist[c1] = true;
						}
					}
				}
				
				for(let citem in checklist) {
					if(checklist[citem])
						continue;
					LOG.debug(TAG, "... adding new component {" + citem.getInstanceId() + "#" + citem.getComponentId() + "} to existing distribution");
					// add only those components which are not
					// included within the existing distribution
					pdistribution.getComponents().push(citem);
				}
			}
		},
		/**
		 * Updates an existing association between given device of current application workspace and the distribution
		 * options vector or creates a new assignment between the device and the given distribution vector.
		 *
		 * @param {Documa.distribution.Device} device current or another device of current application context
		 * @param {Documa.distribution.DistributionOptionVector} dvector distribution option vector containing the sets
		 *  of executable, non-executable and replaceable components of specified device
		 */
		updateDistributionOptions: function(device, dvector) {
			if(this._distributionVectorSet[device.getSessionId()]) {
				LOG.debug(TAG, "... updating distribution vector set!");
				throw new Error("Not implemented yet!");
			} else {
				LOG.debug(TAG, "... assigns new distribution vector to device " + device.getSessionId());
				this._distributionVectorSet[device.getSessionId()] = dvector;
			}
		},
		/**
		 * Adds device to device list.
		 *
		 * @param {Documa.distribution.Device} device object representing registered
		 *            device within the application's context
		 * @param {boolean} [isOwned] optional flag is true if specified device
		 *            represents the currently used/owned
		 *            device, else false
		 * @returns {Documa.distribution.Distribution}
		 */
		addDevice: function(device, isOwned = false) {
			LOG.debug(TAG, "... adding device with session id {" + device.getSessionId() + "}");
			this._devicesSet[device.getSessionId()] = device;
			// check whether there is a corresponding distribution; if not create one
			let dist_id = initDistribution.call(this, device);
			if(isOwned) {
				LOG.debug(TAG, "... got description of own device!");
				this._currentDevice = device;
			}
			if(this._deviceAdded) this._deviceAdded(device);
			
			// display notification
			let _uiManager = Documa.RuntimeManager.getUIManager();
			if(_uiManager.getCapView() === _uiManager.getActiveView()) {
				console.debug('config and stuff');
				_uiManager.getCVConfigManager().showNewDeviceNotification(device.getDeviceName());
			}
			return this.getDistribution(dist_id);
		},
		
		/**
		 * @param {string} sid
		 * @returns {Promise}
		 */
		wasAdded: function(sid) {
			let self = this;
			let p = new Promise(function(fulfill) {
				let fn = self._deviceAdded;
				self._deviceAdded = function(device) {
					if(fn) fn(device);
					if(device.getSessionId() === sid) {
						fulfill();
						p.fulfilled = true;
					}
				};
			});
			return p;
		},
		
		/**
		 * Removes device with given session id from device
		 * registry of the distribution manager.
		 *
		 * @param {String} sid session id of device to be removed
		 */
		removeDevice: function(sid) {
			LOG.debug(TAG, "... removing device with session id {" + sid + "}");
			let device = this._devicesSet[sid];
			if(!device)
				throw new Error("Could not determine device from session id {" + sid + "}");
			removeDistribution.call(this, device);
			delete this._devicesSet[sid];
		},
		/**
		 * Returns device description object from given session
		 * id.
		 *
		 * @param {String} sid session id of the device to be
		 *            returned
		 * @return {Documa.distribution.Device} device
		 *         represention object
		 */
		getDevice: function(sid) {
			return this._devicesSet[sid];
		},
		/**
		 * Returns device description object representing the
		 * device that is currently executing this csr client.
		 *
		 * @return {Documa.distribution.Device} description
		 *         object of current device
		 */
		getCurrentDevice: function() {
			return this._currentDevice;
		},
		/**
		 * Create USE_DIST_TARGET_CMD and send it back to the
		 * server as response to the choice-distribution
		 * request.
		 *
		 * @param {Array} targets array of distribution targets as
		 *            <code>Ext.data.Record</code>
		 */
		useDistributionTargets: function(targets) {
			// create SELECT DISTRIBUTION TARGET command for
			// each selected runtime context
			for(let i = 0; i < targets.length; ++i) {
				// retrieve distribution target object from
				// selected data record
				let distid = targets[i].data.distid;
				
				// retrieving related distribution object from
				// selected target
				let distribution = this._distributionOptionSet[distid];
				if(!distribution) {
					throw new Error("Could not retrieve distribution item from selected distribution target with id {" + distid + "}!");
				}
				// get distribution target object as
				// <code>Documa.distribution.DistributionTarget</code>
				// from session id of selected data record item
				let targetObject = distribution.getRuntimeTargetSet()[targets[i].data.sid];
				if(!targetObject) {
					throw new Error("Could not determine distribution target object from target registry!");
				}
				
				// getting application's parameters
				let appid = this._appContext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
				let appversion = this._appContext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
				let appinstid = this._appContext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
				
				// create SELECT_DIST_TARGET-command
				let command = this._cfactory.createSelectDistributionTargetCommand(appid, appversion, appinstid, distribution.getId(), targetObject.getSessionId());
				// send command to server
				Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(command);
			}
		},
		/**
		 * Closes the distribution options view.
		 */
		closeChoiceDistributionView: function() {
			this._choiceview.close();
		},
		/**
		 * Returns set of component representation items from
		 * specified session id.
		 *
		 * @param {String} sid session id of runtime context
		 *            executing a specific set of component
		 * @returns {Array} array containing set of components
		 *         executed by specified runtime context, null
		 *         if no device with given session id could be
		 *         found
		 */
		getComponentsFromDevice: function(sid) {
			for(let i = 0; i < this._distributionSet.length; ++i) {
				let distribution = this._distributionSet[i];
				if(distribution.getSessionId() === sid) {
					return distribution.getComponents();
				}
			}
			return null;
		},
		/**
		 * Returns set of channel representation items from
		 * specified session id.
		 *
		 * @param {String} sid session id of runtime context.
		 * @returns {Array} array containing set of channels,
		 * null if no device with given session id could be found.
		 */
		getChannelsFromDevice: function(sid) {
			for(let i = 0; i < this._distributionSet.length; ++i) {
				let distribution = this._distributionSet[i];
				if(distribution.getSessionId() === sid) {
					return distribution.getChannels();
				}
			}
			return null;
		},
		/**
		 * Returns device representation from specified
		 * component's instance id. The method analyzes the
		 * current application's distribution state and
		 * determine the current runtime context of defined
		 * component.
		 *
		 * @param {String} instid component's instance id to get the
		 *            device representation from
		 */
		getDeviceFromComponent: function(instid) {
			let sid = null;
			for(let i = 0; i < this._distributionSet.length; ++i) {
				let distribution = this._distributionSet[i];
				let citems = distribution.getComponents();
				for(let j = 0; j < citems.length; ++j) {
					let ci = citems[j];
					if(ci.getInstanceId() === instid) {
						sid = distribution.getSessionId();
						break;
					}
				}// eof second for-loop
				if(sid) {
					// session id found --> break
					break;
				}
			}// eof first for-loop
			if(!sid) {
				LOG.warn(TAG, "... could not determined device from component's instance id: " + instid);
				return null;
			}
			// returning device representation from determined
			// sid
			return this.getDevice(sid);
		},
		/**
		 * Triggers the server-side coordinated migration transaction. It creates and sends a
		 * START MIGRATION command to the server-side distribution manager.
		 *
		 * @param {Documa.distribution.migration.Migration} migration object represents migration process
		 */
		triggerMigration: function(migration) {
			LOG.debug(TAG, "... triggers server-side coordinated migration process");
			startMigration.call(this, migration);
		},
		/**
		 * Starts migration of specified component set to given
		 * target device. The process contains the state
		 * extraction, the component and state transfer.
		 *
		 * @param {Documa.distribution.Device}
		 *            targetDevice device representing the
		 *            target context
		 * @param {Array} components
		 *            array of component items, each element is a
		 *            Documa.distribution.ComponentItem
		 * @param {Function} successCb
		 *            callback handler that signals the successful ready
		 *            state of all specified components passed over as
		 *            input parameters
		 * @param {Function} failureCb
		 *            callback handler that signals the cancellation of
		 *            current prepare phase
		 */
		prepareComponentMigration: function(targetDevice, components, successCb, failureCb) {
			LOG.debug(TAG, "... starting to migrate components to target device: " + targetDevice.getSessionId() + " name:" + targetDevice.getDeviceName());
			// definition of migration prepare request
			/**
			 * map
			 * {
			 *  <instid>: {
			 * 		checkpoint : <Documa.components.Checkpoint>
			 * 		events : <array>
			 *  },
			 * <instid>: {
			 *  ...
			 * },
			 *  ...
			 * }
			 */
			let self = this;
			let stateEntities = {};
			// preparation phase of distributed migration transaction
			let readyCounter = 0;
			for(let i = 0; i < components.length; ++i) {
				/** @type Documa.distribution.ComponentItem */
				let cmp = components[i];
				// get component's instance id
				let instid = cmp.getInstanceId();
				// get associated container from component's instance id
				let container = Documa.RuntimeManager.getComponentManager().getContainerElementById(instid);
				// request component container to prepare for component migration process
				// callback function will be called after the current container and its
				// component instance signals a ready state (abort in negative case)
				container.prepareMigration(function(readyState, checkpoint, events) {
					// executed after the component signals ready or abort
					LOG.debug(TAG, "... component {" + instid + "} is ready for migration!");
					// check for ready state of current container
					if(readyState) {
						// container signals ready
						if(!(checkpoint instanceof Documa.components.ComponentCheckpoint)) {
							throw new Error("Invalid type of checkpoint argument!");
						}
						// current component signals ready for
						// migration --> increment counter
						readyCounter++;
						// add state data into state set
						stateEntities[instid] = {
							checkpoint: checkpoint,
							events: events
						};
					} else {
						let error = new Error("Component {" + instid + "#" +
							cmp.getComponentId() + "} cancelled migration transaction!");
						// a single component signals not ready, i.e. the whole prepare phase
						// has to signal the cancellation of the migration transaction (A in ACID principle)
						failureCb.call(self, error, cmp);
					}
					// test for ready state of every migrating component included in current prepare
					// request coordinated by the server-side distribution manager
					if(readyCounter === components.length) {
						// all components are ready for migration
						LOG.debug(TAG, "... all components are ready for migration");
						// signal successful ready state of all
						// specified components to migrate
						// hand over the components state data
						successCb.call(self, stateEntities);
					}
					
				}, function(error) {
					LOG.warn(TAG, "... could not prepare current container {" + instid + "} due to error: " + error);
					let errorMsg = "Could not prepare migration, because of error: \n" + error.toString();
					Documa.RuntimeManager.getUIManager().showError(errorMsg);
					// component container signals an error state
					failureCb.call(self, error, cmp);
				});
			}
		},
		/**
		 * Called during the Prepare-phase of a distributed
		 * migration process. Another client is requesting the
		 * current client if it could be used as target runtime
		 * context for a specific set of mashup components.
		 *
		 * @param {Documa.distribution.migration.MigrationPrepareRequest} request
		 *                            object including request parameter
		 *                            (request sender, migrating components)
		 * @param {PrepareResponseCallback} callback function that is called after the migration ready
		 *  state was determined
		 */
		onMigrationPrepareRequest: function(request, callback) {
			LOG.debug(TAG, "... received PREPARE_MIGRATION request.");
			try {
				// decide between possible roles of the current runtime container
				switch (request.getRuntimeRole()) {
					case Documa.distribution.migration.MigrationRoles.Source: {
						// *************************************************************************
						// current runtime container is migration source --> component prepare check
						// *************************************************************************
						LOG.debug(TAG, "... prepare migration request as source container!");
						
						let communicationManager = Documa.RuntimeManager.getCommunicationManager();
						let readycount = 0;
						let component_states = {};
						let mid = request.getMigrationId();
						this._migrationHistory[mid] = request;
						
						// analyze each distribution state modification
						let modifications = request.getModifications();
						for(let i = 0; i < modifications.length; ++i) {
							let modification = modifications[i];
							
							// consider different distribution state modification types
							switch (modification.getType()) {
								case Documa.distribution.DistributionModificationTypes.ADD:
									// ***********************************************************************************
									// ADDING COMPONENTS TO SOURCE RUNTIME ***********************************************
									// ***********************************************************************************
									if(communicationManager.getClientID() === modification.getTarget()) {
										// modification addresses current container --> self migration is not allowed
										// throw new Error("Adding of migrating components to source container is not allowed!");
									}
									
									LOG.debug(TAG, "...prepare adding components to target container {" + modification.getTarget() + "} for migration!");
									let components = modification.getComponents();
									let targetDevice = this.getDevice(modification.getTarget());
									if(!targetDevice)
										throw new Error("Could not determine valid target device from session id: " + modification.getTarget());
									
									// prepare each component included in distribution
									// state modification
									this.prepareComponentMigration(targetDevice, components, function(statedata) {
										// **************************************************
										// handler called on successful component preparation
										// **************************************************
										LOG.debug(TAG, "... all components of modification " + modification.getId() + " are ready for migration!");
										
										// append state data into map of component states
										for(let instid in statedata) {
											if(component_states[instid])
												throw new Error("State of component" + instid + " was extracted already!");
											// append state item
											component_states[instid] = statedata[instid];
										}
										
										// increment ready count
										++readycount;
										if(readycount === modifications.length) {// all subset of migrating components are ready
											
											// create migration prepare ready response and send it back to the server-side distribution manager
											let readyCode = Documa.distribution.transaction.PrepareCodes.ALL_COMPONENTS_READY;
											
											// getting map of component states as serializable states array
											let states = getSerializableComponentStates(component_states);
											
											LOG.debug(TAG, "... responding with migration prepare response parameters {mid: " + mid + ", readyCode: " + readyCode + "}");
											// hand over migration response message including component
											callback(new Documa.distribution.transaction.PrepareResponse(mid, readyCode, states));
										}
									}, function(error, component) {
										// *****************************************************
										// handler called during cancellation of prepare request
										// *****************************************************
										LOG.debug(TAG, "... could not prepare components for migration!");
										// determine ready code
										let readyCode = Documa.distribution.transaction.PrepareCodes.NOTALL_COMPONENTS_READY;
										// create migration prepare cancel response and send it back to the server-side distribution manager
										callback(new Documa.distribution.transaction.PrepareResponse(mid, readyCode, {
											error: error,
											component: {
												instance: component.getInstanceId(),
												component: component.getComponentId()
											}
										}));
									});
									break;
								case Documa.distribution.DistributionModificationTypes.REM:
									// ***********************************************************************************
									// REMOVING COMPONENTS FROM SOURCE RUNTIME *******************************************
									// ***********************************************************************************
									LOG.debug(TAG, "...prepare removing components from source container for migration!");
									throw new Error("Not implemented yet!");
									break;
							}
						}
						break;
					}
					case Documa.distribution.migration.MigrationRoles.Target: {
						// **************************************************************************
						// current runtime container is a migration target --> context validity check
						// **************************************************************************
						LOG.debug(TAG, "... migration ready request received!");
						let readyCode = Documa.distribution.transaction.PrepareCodes.NOTALL_COMPONENTS_EXECUTABLE;
						let mid = request.getMigrationId();
						// register request as task at the migration history
						this._migrationHistory[mid] = request;
						// analyze current characteristics of delivery context
						let execmap = analyzeContextValidity.call(this, request);
						for(let instid in execmap) {
							if(!execmap[instid]) {
								callback(new Documa.distribution.transaction.PrepareResponse(mid, readyCode, {
									description: "Runtime environment is not ready to integrate component {" + instid + "}",
									execmap: execmap
								}));
							}
						}
						// all components are ready for integration --> start integration job now
						try {
							let modifications = request.getModifications();
							let componentManager = Documa.RuntimeManager.getComponentManager();
							for(let i = 0; i < modifications.length; ++i) {
								// get current distribution state modification from request
								let mod = modifications[i];
								// test for current modification type
								switch (mod.getType()) {
									case Documa.distribution.DistributionModificationTypes.ADD:
										LOG.debug(TAG, "... integrating migrating components!");
										// ****************************************************************************************
										// 1. trigger integration process of each migrating component --> use the component manager
										// ****************************************************************************************
										componentManager.addComponents(mod, function(integrationJob) {
											// integration executed successfully
											if(!(integrationJob instanceof Documa.components.integration.IntegrationJob))
												throw new Error("Invalid integration result argument!");
											
											LOG.debug(TAG, "... integration of migrating components completed!");
											LOG.debug(TAG, "... starting with component state injection!");
											// **************************************************************
											// 2. inject the state data into the initialized components *****
											// **************************************************************
											// steps of component integration
											// create state injection object that encapsulates the state transfer mechanism
											let cstates = deserializeComponentState(request.getStateData());
											let injector = new Documa.distribution.migration.MigrationStateInjector(cstates, componentManager);
											let stateObjects = injector.getStateObjects();
											
											// check list to determine state after all component states where injected
											// completetly
											let injectStates = {};
											
											// init check list
											for(let i = 0; i < stateObjects.length; ++i) {
												let so = stateObjects[i];
												injectStates[so.getInstanceId()] = false;
											}
											
											// start state injection with respect to every migrated component
											injector.injectState(function(result, stateObject) {
												if(!result) {
													LOG.error(TAG, "Could not inject component state, because of: " + stateObject);
													return;
												}
												
												LOG.debug(TAG, "... state injection of component {" + stateObject.getInstanceId() + "} accomplished!");
												
												// mark state injection in previous check list
												injectStates[stateObject.getInstanceId()] = true;
												
												// check if there is at least a stateless component
												for(let sid in injectStates) {
													if(!injectStates[sid]) {
														LOG.debug(TAG, "... state of component " + sid + " not injected yet!");
														return;
													}
												}
												
												LOG.debug(TAG, "... all component states injected!");
												// **************************************************************
												// 3. create response message and send it back to the server-side
												// **************************************************************
												// create migration ready response event and send it back to the server
												readyCode = Documa.distribution.transaction.PrepareCodes.ALL_COMPONENTS_EXECUTABLE;
												callback(new Documa.distribution.transaction.PrepareResponse(mid, readyCode, {
													description: "Runtime environment is ready to complete migration transaction!",
													execmap: execmap
												}));
											});
											LOG.debug(TAG, "... injecting activity events and checkpoint data.");
										}, function(error) {
											LOG.error(TAG, "Error during component integration: " + error);
											throw new Error("Not implemented yet!");
										});
										break;
									case Documa.distribution.DistributionModificationTypes.REM:
										throw new Error("Not implemented yet!");
										break;
								}// eof switch-statement
							}// eof for-statement
						} catch (error) {
							//*************************************
							// failure during component integration
							//*************************************
							LOG.error(TAG, error.stack);
							readyCode = Documa.distribution.transaction.PrepareCodes.NO_COMPONENT_EXECUTABLE;
							callback(new Documa.distribution.transaction.PrepareResponse(mid, readyCode, {
								description: "Error occured during component and state integration!",
								error: error
							}));
						}
						break;
					}
				}
			} catch (error) {
				LOG.error(error.stack);
				let mid = request.getMigrationId();
				let readyCode = Documa.distribution.transaction.PrepareCodes.NO_COMPONENT_EXECUTABLE;
				callback(new Documa.distribution.transaction.PrepareResponse(mid, readyCode, {
					description: "Error occured during component and state integration!",
					error: error
				}));
			}
		},
		/**
		 * Called on reception of the COMMIT migration transaction. In this
		 * method two cases are considered: a) sender-side and b) receiver-side
		 * COMMIT request handling. On sender-side buffered input events are
		 * collected, blocked components and corresponding communication channels
		 * should be removed and last a ACK signal is send back to the server-side.
		 * On receiver-side blocked components are freed and downstream events
		 * will be applied.
		 *
		 * @param {Documa.distribution.migration.MigrationCommitRequest} request
		 * @param {CommitResponseCallback} callback
		 */
		onMigrationCommitRequest: function(request, callback) {
			try {
				// 1. determine role of current runtime container --> crole
				// 2. id of migration
				let migration = request.getMigration();
				let modifications = migration.getModifications();
				let componentManager = Documa.RuntimeManager.getComponentManager();
				let eventBroker = Documa.RuntimeManager.getEventBroker();
				let layoutManager = Documa.RuntimeManager.getUIManager().getLayoutManager();
				switch (request.getRuntimeRole()) {
					case Documa.distribution.RuntimeRoles.Source: {
						LOG.debug(TAG, "... starting migration commit phase on receiver-side!");
						// 1st getting downstream events from all containers and pack it into ACK-signal
						// 2nd remove blocked components and corresponding container objects
						// 3rd remove component channels
						// 4th send back ACK signal
						
						// determine each migrating component
						let downstreamevents = [];
						for(let i = 0; i < modifications.length; ++i) {
							/** @type {Documa.distribution.DistributionModification} */
							let m = modifications[i];
							let citems = m.getComponents();
							for(let j = 0; j < citems.length; ++j) {
								/** @type {Documa.distribution.ComponentItem} */
								let citem = citems[j];
								LOG.debug(TAG, "... collecting downstream events from component: " + citem.getInstanceId());
								let container = componentManager.getContainerElementById(citem.getInstanceId());
								if(!container) {
									throw new Error("Could not determine component container from instance id: " + citem.getInstanceId());
								}
								
								LOG.debug(TAG, "... blocking channel subscribers of component: " + citem.getInstanceId());
								// block all channels which are referencing current component as subscriber
								eventBroker.blockChannelsOfSubscriber(citem.getInstanceId());
								LOG.debug(TAG, "... remove channels from component:" + citem.getInstanceId());
								// remove all channels which are containing current component as publisher and have no
								// further local components as receiver and remove them
								eventBroker.removeChannelsFromComponent(citem.getInstanceId());
								LOG.debug(TAG, "... remove component {" + citem.getInstanceId() + "} from layout!");
								// remove component container from layout
								layoutManager.remove(container);
								LOG.debug(TAG, "... collecting downstream events for component: " + citem.getInstanceId());
								// get buffer of events collected during the blocking phase
								// serialize down stream events and append them
								let buffer = container.getInputEventBuffer().getDownstreamEventBuffer();
								let events = [];
								for(let eventId in buffer) {
									/** @type Documa.components.ComponentInputEvent */
									let evt = buffer[eventId];
									events.push(evt.serialize());
								}
								// append down stream events
								downstreamevents.push({
									cinstance: citem.getInstanceId(),
									events: events
								});
								
								LOG.debug(TAG, "... removing component {" + citem.getInstanceId() + "} on migration commit request on sender-side!");
								// remove current component item referenced in
								// distribution modification of migration object
								componentManager.removeComponent(citem.getInstanceId(), citem.getComponentId());
							}
						}
						// finish migration processing steps on sender-side
						callback(new Documa.distribution.transaction.CommitResponse(migration.getId(), downstreamevents));
						break;
					}
					case Documa.distribution.RuntimeRoles.Target: {
						LOG.debug(TAG, "... starting migration commit phase on receiver-side!");
						// creating state injector object to handover downstream events to reintegrated and unblocked components
						// for resuming their execution
						let msi = new Documa.distribution.migration.MigrationStateInjector(null, componentManager);
						// 1st unblock reintegrated components
						// 2nd apply downstream events from sender-side
						// 3rd send back ACK-signal
						// throw new Error("Not implemented yet!");
						for(let i = 0; i < modifications.length; ++i) {
							/** @type {Documa.distribution.DistributionModification} */
							let m = modifications[i];
							let citems = m.getComponents();
							for(let j = 0; j < citems.length; ++j) {
								/** @type Documa.distribution.ComponentItem */
								let citem = citems[j];
								LOG.debug(TAG, "... committing migration for component instance: " + citem.getInstanceId());
								let container = componentManager.getContainerElementById(citem.getInstanceId());
								// unblocking reintegrated components
								container.unblock();
								// get downstream events and inject them using the state injector
								let devents = getDownstreamEventsFromComponent.call(this, citem.getInstanceId(), request.getDownstreamEvents());
								if(!devents)
									throw new Error("Could not determine downstream events from component: " + citem.getInstanceId());
								
								LOG.debug(TAG, "... injecting downstream events to component instance: " + citem.getInstanceId());
								msi.injectDownstreamEvents(container, devents);
							}
						}
						// finish migration processing steps on sender-side
						callback(new Documa.distribution.transaction.CommitResponse(migration.getId(), null));
						break;
					}
				}
			} catch (error) {
				LOG.error(TAG, error.stack);
				Documa.RuntimeManager.getUIManager().showError(error.toString());
			}
		},
		/**
		 * Executed after the server-side distribution manager has triggered the cancellation
		 * of the migration process.
		 *
		 * @param {Documa.distribution.migration.MigrationCancelRequest} request cancellation request containing migration description object
		 * @param {CancelResponseCallback} callback
		 */
		onMigrationCancelRequest: function(request, callback) {
			let migration = request.getMigration();
			let modifications = migration.getModifications();
			let componentManager = Documa.RuntimeManager.getComponentManager();
			let uiManager = Documa.RuntimeManager.getUIManager();
			uiManager.showInfo("Cancelling migration! Reason: " + request.getReason());
			switch (request.getRuntimeRole()) {
				case Documa.distribution.migration.MigrationRoles.Source: {
					// **************************************************
					// CANCEL migration on sender-side ******************
					// **************************************************
					LOG.debug(TAG, "... cancelling migration {" + migration.getId() + "} on sender-side.");
					// map represents cancellation result for each component container
					let cancellationMap = {};
					
					// init cancellation map
					for(let i = 0; i < modifications.length; ++i) {
						let components = modifications[i].getComponents();
						for(let j = 0; j < components.length; ++j) {
							let citem = components[j];
							// init cancellation completion value
							cancellationMap[citem.getInstanceId()] = false;
						}
					}
					
					/**
					 * Check if each entry within the specified map
					 * @param {object} map
					 */
					let checkCancellationMap = function(map) {
						for(let instid in map) {
							if(!map[instid])
								return false;
						}
						return true;
					};
					
					// iterating over each distribution state modification and
					// its included set of components
					for(let i = 0; i < modifications.length; ++i) {
						let m = modifications[i];
						let components = m.getComponents();
						
						// getting all components from current distribution state modification
						for(let j = 0; j < components.length; ++j) {
							let citem = components[j];
							let container = componentManager.getContainerElementById(citem.getInstanceId());
							
							// start cancelling the migration process of current container
							container.cancelMigration(function(cnt) {
								// cancellation succeeded
								/** @type {Documa.components.ComponentContainer} cnt */
								cancellationMap[cnt.getComponentInstanceID()] = true;
								if(checkCancellationMap(cancellationMap)) {
									// every cancellation process of each migrating component completed successfully
									// create ACK event and send it back to the server-side distribution manager
									//throw new Error("ACK event on successfull cancellation completion not implemented yet!");
									callback(new Documa.distribution.transaction.CancelResponse(
										migration.getId(),
										Documa.distribution.transaction.CancelCodes.OK,
										null)
									);
								}
							}, function(cnt, error) {
								// failure during cancellation
								let uiman = Documa.RuntimeManager.getUIManager();
								uiman.showError(error.toString());
								
								// create ACK event with error message as payload and send it back to the
								// server-side distribution manager
								callback(new Documa.distribution.transaction.CancelResponse(
									migration.getId(),
									Documa.distribution.transaction.CancelCodes.FAILURE,
									error.toString())
								);
							});
						}
					}
					break;
				}
				case Documa.distribution.migration.MigrationRoles.Target: {
					// map represents result of each cancellation process for each corresponding component
					let removalMap = {};
					
					// initilization of removal map
					for(let i = 0; i < modifications.length; ++i) {
						let modification = modifications[i];
						removalMap[modification.getId()] = false;
					}
					
					/**
					 * Returns true if all components of each modification were removed successfully during the
					 * cancellation process.
					 *
					 * @param {Object} map
					 */
					let checkRemovalMap = function(map) {
						for(let instid in map) {
							if(!map[instid])
								return false;
						}
						
						return true;
					};
					
					// **************************************************************************************
					// CANCEL migration on receiver-side ****************************************************
					// **************************************************************************************
					LOG.debug(TAG, "... cancelling migration {" + migration.getId() + "} on receiver-side.");
					for(let i = 0; i < modifications.length; ++i) {
						let modification = modifications[i];
						
						switch (modification.getType()) {
							case Documa.distribution.DistributionModificationTypes.ADD: {
								// ****************************************************
								// trigger component removal process here *************
								// ****************************************************
								componentManager.removeComponents(modification, function(m) {
									// component removal successfully executed
									LOG.debug(TAG, "... removal of components during migration cancellation completed successfully!");
									
									/** @type {Documa.distribution.DistributionModification} m */
									removalMap[m.getId()] = true;
									
									// check if all components were removed and send back an ACK-event to the
									// server-side distribution manager
									if(checkRemovalMap(removalMap)) {
										// create ACK event and send it back to the server-side distribution manager
										// mid, code, data
										callback(new Documa.distribution.transaction.CancelResponse(
											migration.getId(),
											Documa.distribution.transaction.CancelCodes.OK,
											null));
									}
									// eof success callback
								}, function(components, error) {
									// error during component removal occured
									LOG.error(TAG, "Component removal error during migration cancellation: " + error);
									// create ACK-event with error message as payload and send it back to the
									// server-side distribution manager
									callback(new Documa.distribution.transaction.CancelResponse(
										migration.getId(),
										Documa.distribution.transaction.CancelCodes.FAILURE,
										error.toString())
									);
									// eof
								});
								break;
							}
							case Documa.distribution.DistributionModificationTypes.REM: {
								throw new Error("Remove modification not supported yet!");
								break;
							}
						}
					}
					break;
				}
			}
		},
		
		/**
		 * Called after a migration completed event was received from the server-side
		 * distribution manager. The local distribution manager is responsible for
		 * resuming the application after a migration transaction finished.
		 *
		 * @param {Documa.communication.events.ApplicationEvent} transactionCompleted event including the migration transaction id
		 */
		onTransactionCompleted: function(transactionCompleted) {
			validateTransactionCompletedEvent(transactionCompleted);
			let eventBroker = Documa.RuntimeManager.getEventBroker();
			let tid = transactionCompleted.getPayload().tid;
			LOG.debug(TAG, "... migration {" + tid + "} completed!");
			
			if(this._migrationHistory[tid]) {
				// completed transaction is a migration
				/** @type Documa.distribution.migration.MigrationPrepareRequest */
				let migrationRequest = this._migrationHistory[tid];
				let modifications = migrationRequest.getModifications();
				
				// unblock all channels of migrated subscriber components
				for(let i = 0; i < modifications.length; ++i) {
					let components = modifications[i].getComponents();
					for(let j = 0; j < components.length; ++j) {
						let citem = components[j];
						LOG.debug(TAG, "... unblocking channels for component: " + citem.getInstanceId());
						eventBroker.unblockChannelsOfSubscriber(citem.getInstanceId());
					}
				}
				// TODO: get migration transaction object
				// TODO: fire transaction completed event
			} else if(this._realizationHistory[tid]) {
				// completed transaction is a distribution state realization
				/** @type {Documa.distribution.realization.Realization} */
				let realization = this._realizationHistory[tid].getRealization();
				realization.fireCompleted();
			} else {
				throw new Error("No transaction with id " + tid + " defined!");
			}
		},
		
		/**
		 * Called on the initiation of the application's distribution state during the application creation process.
		 *
		 * @param {Documa.distribution.realization.RealizationPrepareRequest} request
		 * @returns {Promise}
		 */
		onRealizationPrepareRequest: function(request) {
			switch (request.getRuntimeRole()) {
				case Documa.distribution.realization.RealizationRoles.Source: {
					// TODO
					// **********************************************
					// consider the add and removal of components   *
					// to/from existing distributions               *
					// **********************************************
					let self = this;
					return new Promise(function(resolve, reject) {
						let realization = request.getRealization();
						self._realizationHistory[realization.getId()] = request;
						self.doRequest(Documa.communication.commands.RequestActions.PREP_REALIZE,
							realization.serialize(), request.getTargetSessions(),
							function(response) {
								/* nothing happens here */
							}, function(response) {
								let errorCode = response.getStatus();
								reject(new Error("Error during the initial distribution " +
									"state realization! Error code: " + errorCode));
							});
					});
				}
				case Documa.distribution.realization.RealizationRoles.Target: {
					let self = this;
					let uiManager = Documa.RuntimeManager.getUIManager();
					
					// consider the distribution state transaction on the ui layer
					uiManager.getMetaUIController().consider(request.getRealization());
					
					return new Promise(function(resolve, reject) {
						let readyCode = Documa.distribution.PrepareCodes.NOTALL_COMPONENTS_EXECUTABLE;
						
						// getting transaction id -> used in the response message to associate the prepare response
						// to its triggering request (preserving the transaction context)
						let rid = request.getRealization().getId();
						let sessionid = Documa.RuntimeManager.getCommunicationManager().getClientID();
						if(!self._realizationHistory[rid])
							self._realizationHistory[rid] = request;
						
						// analyze current characteristics of delivery context
						let execmap = analyzeContextValidity.call(this, request);
						for(let instid in execmap) {
							if(!execmap[instid]) {
								// current component instance is not executable
								let response = new Documa.distribution.transaction.PrepareResponse(rid, readyCode, {
									description: "Runtime environment is not ready to integrate component {" + instid + "}",
									execmap: execmap
								});
								resolve(response);
							}
						}
						// all components are ready for integration ==> start integration job now
						/** @type {Array.<Documa.distribution.DistributionModification>} */
						let modifications = request.getRealization().getModifications();
						let componentManager = Documa.RuntimeManager.getComponentManager();
						modifications.forEach(function(mod, i) {
							switch (mod.getType()) {
								case Documa.distribution.DistributionModificationTypes.CREATE: {
									// 1: create a corresponding distribution instance
									// 2: test whether the created distribution is addressing the current host device
									// 2a: if distribution is addressing current host device start integration process
									//     of all corresponding components
									// 3: add distribution instance to the distribution set
									// 4: create a transaction response describing the integration of all components as
									//    well as the synchronization of the distribution state (extension of
									//    distribution set)
									// test whether current modification is addressing current host device
									if(mod.getTarget() === sessionid) {
										LOG.debug(TAG, "... integrating components during initial distribution state realization!");
										request.getRealization().firePreparing();
										// *************************************************************************
										// 1. trigger integration for each component --> use the component manager *
										// *************************************************************************
										componentManager.addComponents(mod, function(integrationJob) {
											// all component were integrated successfully
											if(!(integrationJob instanceof Documa.components.integration.IntegrationJob))
												throw new Error("Invalid integration result argument!");
											
											LOG.debug(TAG, "... integration of components completed!");
											
											// create the realization response notifying the server-side coordinator about
											// current preparation state
											readyCode = Documa.distribution.transaction.PrepareCodes.ALL_COMPONENTS_EXECUTABLE;
											resolve(new Documa.distribution.transaction.PrepareResponse(rid, readyCode, {
												description: "Runtime environment is ready to complete the realization transaction!",
												execmap: execmap
											}));
											request.getRealization().firePrepared();
										}, function(error) {
											// error during the component integration
											LOG.error(TAG, error.stack);
											reject(error);
										});
									} else {
										let distributionUpdate = new Documa.distribution.DistributionUpdate(mod);
										distributionUpdate.setSuccessCallback(function(distribution) {
											LOG.debug(TAG, "Distribution of device " + distribution.getSessionId() + " updated!");
										});
										distributionUpdate.setErrorCallback(function(error) {
											LOG.error(TAG, error.stack);
										});
										// register a callback for being notified after the corresponding distribution
										// was changed
										self._distributionChanges[mod.getId()] = distributionUpdate;
									}
									break;
								}
								case Documa.distribution.DistributionModificationTypes.ADD:
								case Documa.distribution.DistributionModificationTypes.REM:
									throw new Error("Those modification types are not supported in this context!");
							}
						});
					});
				}
			}
		},
		
		/**
		 * Called for committing the realization of the application's distribution state.
		 *
		 * @param {Documa.distribution.realization.RealizationCommitRequest} request
		 * @returns {Promise}
		 */
		onRealizationCommitRequest: function(request) {
			let self = this;
			return new Promise(function(resolve, reject) {
				try {
					let realization = request.getRealization();
					// get current host device
					let device = Documa.RuntimeManager.getRuntimeContext().getDevice();
					let componentManager = Documa.RuntimeManager.getApplicationContext().getComponentManager();
					let modification = realization.getModificationFrom(device);
					
					// test whether the transaction is addressing the current device
					if(modification) {
						modification.getComponents().forEach(function(citem) {
							let container = componentManager.getContainerElementById(citem.getInstanceId());
							if(!container) {
								throw new Error("Could not determine component " +
									"container from instance id: " + citem.getInstanceId());
							}
							// unblocking integrated component
							container.unblock();
						});
					}
					// ACK commit request
					resolve(new Documa.distribution.transaction.CommitResponse(realization.getId(), null));
					realization.fireCompleted();
				} catch (error) {
					reject(error);
				}
			});
		},
		
		/**
		 * Called to cancel the distribution state realization transaction and to rollback the distribution
		 * state modifications.
		 *
		 * @param request
		 * @returns {Promise}
		 */
		onRealizationCancelRequest: function(request) {
			throw new Error("Not implemented yet!");
		},
		
		/**
		 * Called to add new channels to their corresponding distributions.
		 *
		 * @param event
		 * @returns {Promise}
		 */
		onChannelCreated: function(event) {
			// get the payload
			let channel = event.payload;
			let comPartners = channel.sender.concat(channel.receiver);
			
			// set type of the channel as a number
			channel.type = new Number(channel.type);
			
			// depending on the channel type instantiate the channel 
			switch (channel.type.valueOf()) {
				case Documa.communication.channels.ChannelTypes.LINK:
					channel = new Documa.communication.channels.LinkChannel(channel);
					break;
				case Documa.communication.channels.ChannelTypes.BACKLINK:
					channel = new Documa.communication.channels.BackLinkChannel(channel);
					break;
				case Documa.communication.channels.ChannelTypes.PROPLINK:
					channel = new Documa.communication.channels.PropertyLinkChannel(channel);
					break;
				default:
					LOG.debug(TAG, "Invalid channel type '" + channel.type + "' given!");
					return;
			}
			
			// save the channel into the distributions
			for(let i = 0; i < comPartners.length; i++) {
				let device = this.getDeviceFromComponent(comPartners[i].instid);
				let distribution = this.getDistributionFromDevice(device);
				distribution.addChannel(channel);
			}
		},
		
		/**
		 * Called after a server-side event was received and
		 * the distribution manager is listening for the specified event message.
		 *
		 * @param {Documa.communication.events.Event} eventMsg
		 */
		handleEvent: function(eventMsg) {
			if(!eventMsg.payload)
				throw new Error("Invalid event, no payload available!");
			throw new Error("Not implemented yet!");
		},
		/**
		 * Returns component item instance from specified
		 * component instance id.
		 *
		 * @param {String}
		 *            instid component instance id
		 * @return {Documa.distribution.ComponentItem} component
		 *         item instance
		 */
		getComponentItem: function(instid) {
			return this._componentItems[instid];
		},
		
		/**
		 * Returns decsriptor from remote component with given component id.
		 *
		 * @param {String} cid component id defined in smcdl
		 * @return {Document} component descriptor DOM representation
		 */
		getRemoteComponentDescriptor: function(cid) {
			return this._remoteDescriptors[cid];
		},
		
		/**
		 * Returns collection of remote descriptors.
		 * @returns {Object.<String, Document>}
		 */
		getRemoteComponentDescriptors: function() {
			return this._remoteDescriptors;
		},
		
		/**
		 * Requests potential migration options considering the specified client as migration source and its components
		 * as migration subjects.
		 *
		 * @param {String} sourceClient identifier of the migration source device
		 * @returns {Promise.<Array.<Documa.distribution.migration.options.MigrationOption>>}
		 */
		requestCurrentMigrationOptions: function(sourceClient) {
			return new Promise((fulfill, reject) => {
				/**
				 * @param {{options: Array.<Documa.distribution.migration.options.MigrationOptionType>}} result
				 */
				let handler = function(result) {
					// received migration options successfully
					/** @type {Array.<Documa.distribution.migration.options.MigrationOption>} */
					let resultCollection = [];
					for(let option of result.options) {
						resultCollection.push(new Documa.distribution.migration.options.MigrationOption(option));
					}
					fulfill(resultCollection);
				};
				requestMigrationOptions(sourceClient)
					.then(handler)
					.catch(function(error) {
						// failure during migration options request
						reject(error);
					});
			});
		}
	};
})());
