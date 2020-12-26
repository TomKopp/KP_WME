Ext.namespace('Documa.components');

Documa.require('Documa.util.Logger');
Documa.require('Documa.components.ComponentContainer');
Documa.require('Documa.components.integration.IntegrationJob');
Documa.require('Documa.communication.channels.LinkChannel');

Documa.require('Documa.communication.events.EventFactory');
Documa.require('Documa.communication.events.DescriptorReqResponse');
Documa.require('Documa.communication.commands.CommandFactory');

Documa.require('Documa.util.ComponentUtil');

/**
 * @callback ErrorCallback
 * @param {Error} error
 */

/**
 * @callback IntegrationSuccessCallback
 * @param {Documa.components.integration.IntegrationJob} success
 */

// life cycle event identifiers fired by the component instance itself
Documa.components.ComponentLifecycleEvents = {
	INITIALIZED: "__mc_initialized", // component life cycle event indication initialized state
	BLOCKED: "__mc_blocked", // component life cycle event indicating pausing state
	PROCESSED: "__mc_processed" // component life cycle event indicating input event processed state
};

// life cycle state identifiers from perspective of the client-side runtime
// environment
Documa.components.ComponentLifecycleStates = {
	INSTANTIATED: "instantiated",
	INTEGRATED: "integrated",
	INITIALIZED: "initialized"
};

Documa.components.ComponentIntegrationTypes = {
	INITIATION: "initiation", // integration happens during the application
	// loading phase
	EXTENSION: "extension", // integration happens as extension of the
	// composition state
	MODIFICATION: "modification" // integration happens as modification of
	// the distribution state
};

Documa.components.CompositionChangedEvents = {
	REMOVED: "component-removed",
	ADDED: "component-added"
};

Documa.components.ComponentInterfaceRequestTypes = {
	CIDS: "cids",
	INSTS: "insts"
};


/**
 * @class
 */
Documa.components.ComponentManager = Ext.extend(Ext.util.Observable, (function(){
	const TAG = 'Documa.components.ComponentManager';

	/***********************************************************
	 * private attributes
	 **********************************************************/
	const LOG = Documa.util.Logger;
	var _efactory = null;
	var _cfactory = null;
	var _self = null;

	/**
	 * This private variable encompasses all component container
	 * instances that are created after all component resources
	 * were received.
	 *
	 * @type {Array.<Documa.components.ComponentContainer>}
	 */
	var _containers = [];

	/** @type {Array.<Documa.components.ComponentContainer>} */
	var _containersToLoad = null;

	/**
	 * This private variable holds the reference to the list of
	 * components, which are described in the INTEGRATECMP
	 * command. Each entry of this list describe a component by
	 * its component id (not instance id), the count of
	 * instances and the list of required resources as a list of
	 * indices that reference several entries in the resources
	 * list.
	 */
	var _components = {};

	/**
	 * This private variable holds the reference to the resource
	 * list. Each component resource is described by an entry
	 * containing a list of all dependent components, a key
	 * describing the implementation language of the resource
	 * and a URL path to the external resource.
	 */
	var _resources = [];

	/**
	 * This registry is filled during the reception of the
	 * INTEGRATECMP command. It defines the current state of
	 * components to be integrated. Each entry of this registry
	 * describes an application component by its component id
	 * (not instance id), the count of instances, the SMCDL
	 * descriptor and a list of default component
	 * configurations. The count of available configurations has
	 * to be equal to the count of component instances.
	 */
	var _componentRegistry = null;

	var _componentRegistryToLoad = null;

	/**
	 * This history registers the integration context of a component instance.
	 * The integration context defines if a component was integrated during
	 * the application loading phase, as a result of the modification of the
	 * application's distribution state or as extension of the composition state
	 * during the runtime.
	 */
	var _integrationHistory = null;

	/**
	 * This private variable holds a reference to the list of
	 * all inter-component channels, which are described as part
	 * of the communication model.
	 */
	var _channels = null;

	/**
	 * This variable maps a component specific mediation
	 * configuration to its component class id.
	 */
	var _mediationConfigs = {};

	/**
	 * This variable should hold a reference to an array of all
	 * operations that should be executed to reach the
	 * applications initial state.
	 */
	var _initStateTransitionOperations = null;

	/**
	 * This flag shows if communication channels between
	 * components are needed or not. It is required in the
	 * special case of one-component-applications without any
	 * communication channels.
	 */
	var _noChannelsNeeded = false;

	/**
	 * Array of successfully initialized components instances
	 * during the WHOLE session of dynamic sharing. 1) It is
	 * used by the Access Control Manager to check user's access
	 * rights and display them. 2) It is used by the Component
	 * Manager and Layout Manager to support dynamic sharing of
	 * components.
	 */

	var _allInitializedInstances = [];

	/**
	 * Map containing a timestamp and a corresponding object
	 * containing a success- and error callback function,
	 * executed after a response (containing a single or several
	 * component descriptors) or an error occurs.
	 */
	var _pendingDescriptorRequests = {};

	var _componentUtil = null;

	/***********************************************************
	 * private methods
	 * ***********************************************************************
	 **********************************************************/
	/**
	 * Method returns ComponentContainer instance from given
	 * component instance id.
	 *
	 * @param {String} instid id of component instance
	 *
	 * @returns {Documa.components.ComponentContainer} or null if
	 *         no container object could be found
	 */
	function getContainer(instid){
		for(let i = 0; i < _containers.length; ++i) {
			let container = _containers[i];
			if(container.getComponentInstanceID() === instid) {
				return container;
			}
		}
		return null;
	}

	/**
	 * Returns a unique id.
	 * @returns {Number}
	 */
	function generateUniqueCallbackId(){
		function getRandomNumber(range){
			return Math.floor(Math.random() * range);
		}

		function getRandomChar(){
			let chars = "0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ";
			return chars.substr(getRandomNumber(62), 1);
		}

		function randomID(size){
			let str = "";
			for(let i = 0; i < size; i++) {
				str += getRandomChar();
			}
			return str;
		}

		return randomID(10);
	}

	/**
	 * Before the component resources are injected into the
	 * runtime context of each component, there is the need to
	 * create a 3-column-table that describes which component
	 * how many times should be instantiated and which resources
	 * each instance needs.
	 *
	 * @param {Array} resources array containing entries, which
	 *            defines the mapping between a resource url and
	 *            the set of dependent components
	 */
	function createComponentResourceTable(resources){
		LOG.debug(TAG, "... creating component-instance-resources table");
		let components = {};

		for(let i = 0; i < resources.length; ++i) {
			let entry = resources[i];

			for(let cid in entry.components) {
				// getting dependency descriptor

				let cidObj = entry.components[cid];

				if(!components[cid]) {
					// create an entry describing which
					// component,
					// how many instance should exist and what
					// resources are required
					components[cid] = {
						// count : cidObj.instances.length,
						instances: cidObj.instances,
						resourceIndices: [i]
						// create link to entry in the
						// resource entry list
					};
				} else {
					let refCounter = components[cid].instances.length;
					let resArray = components[cid].resourceIndices;

					// check the reference counter - they have
					// to be
					// always the same, if not some
					// inconsistency
					// occurred
					if(refCounter !== cidObj.instances.length) {
						throw new Error("Inconsistency in resource dependency description detected on dependency {" + entry.path + "} and component id {" + cid + "}!");
					}

					// bind resource entry to component
					// instances
					resArray.push(i);
				}
			}
		}
		LOG.debug(TAG, "... finished");
		return components;
	}

	/**
	 * Helper method to create a single runtime container of a
	 * distributed mashup component.
	 *
	 * @param {String} cid id of related component, not instance id
	 * @param {String} instid id of component instance defined in the
	 *            application model
	 * @param {Array} indices array of indices pointing to the list
	 *            of resources entries
	 * @param {Array} resources list of required resources
	 *            references and descriptions (content type,
	 *            etc.)
	 * @return {DOMIFrame} runtime container of it's mashup
	 *         component
	 */
	function createComponentContainer(cid, instid, indices, resources){
		LOG.debug(TAG, "... creating runtime container for component with id {" + cid + "}");

		// dissolve indices - get all needed resource entries
		let resEntries = [];

		for(let i = 0; i < indices.length; ++i) {
			let resEntry = resources[indices[i]];
			// dissolve reference to resource table
			let descrObj = resEntry.components[cid];

			// set resource entry according to its position -
			// dependency sorting
			resEntries[descrObj.pos] = resEntry;
		}

		// inject CRUISe runtime lib in each component container
		// because their exist
		// implicit dependencies, e. g. the creation of
		// inter-component messages of class
		// Ext.cruise.client.Message that dependends on other
		// CRUISe classes
		resEntries.push({
			language: 'javascript',
			path: 'lib/documa/components/ComponentMessage.js'
		});
		return new Documa.components.ComponentContainer(cid, instid, resEntries);
	}

	/**
	 * Method is called after each component runtime container
	 * has loaded the external component resources successfully.
	 *
	 * @param {String} jobid id of integration job
	 * @param {String} cid component id
	 * @param {DOMIFrame} container runtime container of a single
	 *            component
	 * @param {Array} resources list of all component resources,
	 *            loaded by the given container element
	 */
	function onContainerLoaded(jobid, cid, container, resources){
		LOG.debug(TAG, "... resources of component with id {" + cid + "} loaded");
		// check if all containers were ready
		if(!checkComponentContainers()) {
			return;
		}
		// handle new state
		_self.onAllResourcesLoaded(jobid, _resources, _components, _containers);
	}

	/**
	 * Helper method to create a list that contains iframes as
	 * runtime container, which provides every resource the
	 * component requires. Each runtime container has the
	 * attribute 'id' that contains the component id value of
	 * it's corresponding mashup component.
	 *
	 * @return {Array} list of DOM iframe elements as runtime
	 *         containers
	 */
	function createRuntimeContainers(components, resources){
		LOG.debug(TAG, "... creating runtime container per component.");
		let containers = [];
		for(let cid in components) {
			// create runtime container per component instance
			for(let i = 0; i < components[cid].instances.length; ++i) {
				let instid = components[cid].instances[i];
				let entry = createComponentContainer(cid, instid, components[cid].resourceIndices, resources);
				containers.push(entry);
			}
		}
		return containers;
	}

	/**
	 * Method triggers the start of resource loading from given
	 * parameters.
	 */
	function startResourceLoading(jobid){
		// test if component panel was already added to the
		// center stage at the
		// presentation layer
		for(let i = 0; i < _containersToLoad.length; ++i) {
			let container = _containersToLoad[i];
			LOG.debug(TAG, "****************************************************************");
			LOG.debug(TAG, "... start loading runtime container of component {" + container.getComponentID() + "}");
			// add loading state observable to ui layer, where
			// it is used to observe and
			// represent the component's state.
			Documa.RuntimeManager.getUIManager().getComponentsLoadView().addLoadingStateObject(container.getLoadingState());
			// start loading component resources
			container.loadResources(container.getComponentInstanceID(), jobid, onContainerLoaded);
			// add container to trigger the loading of resources
			// --> the onload function will
			// be called after the iframe is added to the
			// DOM-tree
			Documa.RuntimeManager.getUIManager().getLayoutManager().add(container);
			LOG.debug(TAG, "****************************************************************");
		}
	};

	/**
	 * Check if all component resources and every component
	 * instance runtime container is ready for component
	 * instantiation.
	 */
	function checkComponentContainers(){
		if(_containersToLoad === undefined || _containersToLoad === null) {
			return false;
		}
		// check if all containers are ready and containing no
		// component
		// instances
		for(let i = 0; i < _containersToLoad.length; ++i) {
			if(!_containersToLoad[i].isReady() || _containersToLoad[i].getComponentInstance() !== null) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Helper method to get a component container instance by
	 * the instance id of its inherent mashup component.
	 *
	 * @param {String}
	 *            instid id of component instance
	 */
	function getContainerByInstanceId(instid){
		// get free container
		for(let j = 0; j < _containers.length; ++j) {
			let container = _containers[j];
			if(container.getComponentInstanceID() === instid && container.getComponentInstance() === null) {
				return container;
			} else if(container.getComponentInstanceID() === instid) {
				LOG.warn(TAG, "... container of instance {" + instid + "} already used!");
				break;
			}
		}
		return null;
	}

	/**
	 * Iterate over all available component container instances
	 * and check if each contains a component instance.
	 *
	 * @return {boolean} true if all components are
	 *         instantiated, else false
	 */
	function areAllComponentsInstantiated(){
		if(!_containersToLoad) {
			return false;
		}
		for(let i = 0; i < _containersToLoad.length; ++i) {
			let container = _containersToLoad[i];
			if(container.getComponentInstance() === null) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Helper method to determine if all current channels were
	 * already registered in the scope of the EventBroker.
	 *
	 * @return {Boolean} true if all known component channels
	 *         were registered already, else false
	 */
	function areAllChannelsAdded(){
		let eventBroker = Documa.RuntimeManager.getEventBroker();
		if(!_channels)
			return false;
		for(let cName in _channels) {
			let channel = _channels[cName];

			if(!eventBroker.getChannel(channel.getName()))
				return false;
		}
		return true;
	}

	/**
	 * Call this method to determine the whole initialization
	 * state of all components.
	 *
	 * @return {Boolean} true if all components were
	 *         initialized, else false
	 */
	function areAllComponentsInitialized(){
		if(!_containersToLoad) {
			return false;
		}
		// check containers initialization state
		for(let i = 0; i < _containersToLoad.length; ++i) {
			if(!_containersToLoad[i].isInitialized()) {
				return false;
			}
		}
		// all containers are initialized
		return true;
	}

	/**
	 * Call this method to determine the integration state of
	 * all components.
	 *
	 * @return {Boolean} true if all components were integrated,
	 *         else false
	 */
	function allComponentsIntegrated(){
		if(!areAllComponentsInstantiated()) {
			return false;
		}
		if(!Documa.RuntimeManager.getEventBroker().areChannelsAdded()) {
			return false;
		}
		return true;
	}

	/**
	 * Helper method to instantiate every component that was
	 * registered previously.
	 *
	 * @param {String} jobid id of integration job
	 */
	function instantiateComponents(jobid){
		LOG.debug(TAG, "... starting component instantiation.");
		for(let cid in _componentRegistryToLoad) {
			let regEntry = _componentRegistryToLoad[cid];
			// check entry structure
			if(!regEntry.configurations || !regEntry.smcd) {
				throw new Error("Unexpected entry structure in component registry on component {" + cid + "}");
			}
			for(let i = 0; i < regEntry.configurations.length; ++i) {
				let compConfig = regEntry.configurations[i];
				let instid = compConfig.id;
				// get next free container that should support
				// the component
				let container = getContainerByInstanceId(instid);
				if(!container)
					throw new Error("Could not find free container to instantiate component {" + instid + "} instance.");
				// instantiate component in its container from
				// smcd and their
				// configuration
				container.instantiateComponent(regEntry.smcd, compConfig, function(container){
					// callback signals container was instantiated
					_self.onComponentInstantiated(jobid, container);
				});
			}
		}
		LOG.debug(TAG, "... component instantiation finished.");
		// add communication channel if recommended component added (condition checking in SidebarRec.js)
		let manager = Documa.RuntimeManager.getUIManager().getSidebarManager();
		manager.getSidebarRec().addChannel();
	}

	/**
	 * Register given channel at the EventBroker component. This
	 * is precondition to integrate communication channels after
	 * all application components were instantiated.
	 *
	 * @param {Documa.components.channel.ComponentChannel} channel
	 *            channel object to register at the
	 *            EventBroker
	 */
	function registerChannel(channel){
		let type = "Link";
		if(channel instanceof Documa.communication.channels.BackLinkChannel)
			type = "BackLink";
		if(channel instanceof Documa.communication.channels.PropertyLinkChannel)
			type = "PropertyLink";
		Documa.RuntimeManager.getEventBroker().addChannel(channel.getName(), type, channel.getParameterTypes(), channel.getSyncThreshold());
	}

	/**
	 * Helper methods checks if one of the required component channel was not integrated. This function
	 * is used to enhance robustness and failure determination.
	 *
	 * @param {String} jobid id of component integration job
	 * @returns {boolean} true if channels are missing, else false
	 */
	function areChannelsMissing(jobid){
		// get integration job from job id
		let integrationjob = this._integrationRegistry[jobid];
		let components = integrationjob.getComponents();
		let regchannels = Documa.RuntimeManager.getEventBroker().getChannels();
		// determine which component channels are missing
		for(let i = 0; i < components.length; ++i) {
			let item = components[i];
			if(!( item instanceof Documa.distribution.ComponentItem))
				throw new Error("Invalid component item detected!");
			// getting component configuration to determine required channel instances
			let instid = item.getInstanceId();
			let cid = item.getComponentId();
			let config = _self.getComponentConfig(cid, instid);
			// validate component configuration
			if(!config || !config.channelpts) {
				throw new Error("Invalid component configuration detected!");
			}
			for(let j = 0; j < config.channelpts.length; ++j) {
				// getting required channel from component configuration
				let channelname = config.channelpts[j].channel;
				// test if the channel was registered
				if(!regchannels[channelname]) {
					LOG.warn(TAG, "... channel: " + channelname + " is still missing!");
					return true;
					//throw new Error("Missing channel: " + channelname + " detected!");
				}
			}
		}
		return false;
	}

	/**
	 * Call this method after all application components were
	 * instantiated successfully.
	 *
	 * @param {String} jobid id of integration job
	 * @return {void}
	 */
	function integrateChannels(jobid){
		LOG.debug(TAG, "... integrating channels!");
		// 1st get available channels from the EventBroker and
		// check if they were added
		// only if they were not added,
		// their registration has to be resumed
		// channel validation method
		if(areChannelsMissing.call(_self, jobid)) {
			LOG.warn(TAG, "... waiting for missing channels!");
			return;
		}
		let eventBroker = Documa.RuntimeManager.getEventBroker();
		let channels = eventBroker.getChannels();
		for(let channelName in channels) {
			if(eventBroker.wasChannelAdded(channelName)) {
				LOG.warn(TAG, "... channel {" + channelName + "} was already added!");
				continue;
			}
			LOG.debug(TAG, "... adding channel {" + channelName + "}");
			// after all components were instantiated, add
			// channels with the help of the
			// client-side EventBroker
			eventBroker.addChannel(channels[channelName]);
			if(!eventBroker.wasChannelAdded(channelName)) {
				// could not find channel as added channel
				LOG.error(TAG, "... channel {" + channelName + "} was not added!");
				return;
			}
			// channel is added now
			LOG.debug(TAG, "... channel {" + channelName + "} was added successfully.");
			_self.onChannelAdded(jobid, channels[channelName]);
		}
	}

	/**
	 * Call this method after all inter-component channels were
	 * integrated successfully.
	 *
	 * @param {String} jobid integration job id
	 * @param {Function} callback completion callback handler
	 */
	function initializeAllComponents(jobid, callback){
		let self = this;
		// make sure the init function of all components is
		// called before a property is set
		for(let i = 0; i < _containersToLoad.length; ++i) {
			let container = _containersToLoad[i];
			let instid = container.getComponentInstanceID();
			// handover integration context type to separate between application initiation
			// and distribution state modification
			container.initializeComponent(_integrationHistory[instid], function(cmpContainer){
				LOG.debug(TAG, "... component {" + cmpContainer.getComponentInstanceID() + "} init completed!");
				cmpContainer.setProperties(function(c){
					// all properties set --> execute callback
					self.onComponentInitialized(jobid, cmpContainer);

					// test whether all components were initialized
					if(areAllComponentsInitialized.call(self)) {
						// reset internal registries
						setTimeout(function(){
							callback();
						}, 500);
					}
				});
			});
		}
	}

	/**
	 * Method to render all components.
	 */
	function showAllComponents(){
		for(let i = 0; i < _containers.length; ++i) {
			let container = _containers[i];
			if(!container.isUI())
				continue;
			container.show();
		}
	}

	function getContainerById(containerId){
		if(!_containers || _containers.length == 0) {
			throw new Error("InvalidStateError");
		}
		for(let i = 0; i < _containers.length; ++i) {
			let container = _containers[i];
			if(containerId === container.getContainerID()) {
				return container;
			}
		}
		return null;
	}

	/**
	 * Helper method to emit running event.
	 */
	function emitApplicationRunningEvent(){
		let runEvent = _efactory.create(Documa.communication.MessageFieldValues.APP_LEVEL, Documa.communication.events.ApplicationEvents.RUNNING, null);
		Documa.RuntimeManager.getEventDispatcher().dispatchEvent(runEvent);
	}

	/**
	 * Helper method for creating publishing the component lifecycle change to the server-side runtime.
	 *
	 * @param {String} instid components instance id
	 * @returns {void}
	 */
	function publishComponentInstantiatedEvent(instid){
		let appcontext = Documa.RuntimeManager.getApplicationContext();
		let event = _efactory.createComponentInstantiatedEvent(appcontext, instid);
		Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(event);
		LOG.debug(TAG, "... component instantiated event sent to server!");
	}

	/**
	 * Helper Function to extract Viewbindings from the SMCDL to a JSON Object
	 *
	 * @param capChildren Children of Capability Object
	 * @returns Array viewbindings JSON Object with all Viewbindings
	 */
	function extractViewbindings(capChildren){
		let viewbindings = [];
		for(let i = 0; i < capChildren.length; i++) {
			if(capChildren[i] !== null && capChildren[i].tagName.indexOf("viewbinding") !== -1) {
				let vb = null;
				if(capChildren[i].children[0].tagName.indexOf("paralleloperation") !== -1) {
					let elems = capChildren[i].children[0].children;
					for(let j = 0; j < elems.length; j++) {
						vb = {
							"id": elems[j].getAttribute("id"),
							"element": elems[j].getAttribute("element"),
							"modifier": elems[j].getAttribute("modifier")
						};
						viewbindings.push(vb);
					}
				} else {
					vb = {
						"id": capChildren[i].children[0].getAttribute("id"),
						"element": capChildren[i].children[0].getAttribute("element"),
						"modifier": capChildren[i].children[0].getAttribute("modifier")
					};
					viewbindings.push(vb);
				}
			}
		}
		return viewbindings;
	}

	/**
	 * Helper method to publish initialized event to server-side
	 * runtime.
	 *
	 * @param {String} instid instance id of initialized component
	 */
	function publishComponentInitializedEvent(instid){
		// getting current application context
		let appcontext = Documa.RuntimeManager.getApplicationContext();
		let appinstid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
		let appid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
		let appversion = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);

		// creating component's lifecycle event and send it to
		// the server-side runtime
		let lifecycle_event = _efactory.createComponentIntializedEvent(appinstid, appid, appversion, instid);
		Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(lifecycle_event);
		LOG.debug(TAG, "... component initialized event sent to server!");
	}

	/**
	 * Helper method to publish descriptor request command to
	 * the server-side runtime.
	 *
	 * @param {Array} cidarray list of component items as {Documa.distribution.ComponentItem}
	 * @param {boolean} includesInsts flag content type indication
	 * @returns {Documa.communication.commands.Command}
	 */
	function getDescriptorRequestCommand(cidarray, includesInsts) {
		// getting current application context
		let appcontext = Documa.RuntimeManager.getApplicationContext();
		let appinstid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
		let appid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
		let appversion = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
		let items = [];
		for(let i = 0; i < cidarray.length; ++i) {
			items.push({
				instanceid: cidarray[i].getInstanceId(),
				componentid: cidarray[i].getComponentId()
			});
		}
		let requestType = (includesInsts) ?
			Documa.components.ComponentInterfaceRequestTypes.INSTS :
			Documa.components.ComponentInterfaceRequestTypes.CIDS;
		// create request command
		return _cfactory.createRequestComponentDescriptorCommand(appid, appversion, appinstid, requestType, items);
	}

	// ***************************************************************************
	// * public members and methods
	// **********************************************
	// ***************************************************************************
	return {
		/**
		 * Constructor.
		 * @constructs
		 */
		constructor: function(){
			Documa.components.ComponentManager.superclass.constructor.call(this);
			LOG.debug(TAG, '... constructing');
			_componentRegistry = {};
			_componentRegistryToLoad = {};
			_channels = {};
			_integrationHistory = {};
			_self = this;
			_efactory = new Documa.communication.events.EventFactory();
			_cfactory = new Documa.communication.commands.CommandFactory();
			_componentUtil = new Documa.util.ComponentUtil();

			/**
			 *
			 * @type {object.<string, Documa.components.integration.IntegrationJob>}
			 * @private
			 */
			this._integrationRegistry = {};
		},
		/**
		 * Registers given integration job, e. g. during the start of an application.
		 * @param {Documa.components.integration.IntegrationJob} integrationJob
		 * @returns {void}
		 */
		addIntegrationJob: function(integrationJob){
			this._integrationRegistry[integrationJob.getId()] = integrationJob;
		},
		/**
		 * Returns corresponding integration job.
		 * @param {String} jobid
		 * @returns {Documa.components.integration.IntegrationJob}
		 */
		getIntegrationJob: function(jobid){
			return this._integrationRegistry[jobid];
		},
		/**
		 * Method is called after the INTEGRATERES-command was
		 * received. The ComponentManager is responsible for the
		 * integration of all required component resources in a
		 * separate runtime container per mashup component.
		 *
		 * @param {String} jobid id of integration job
		 * @param {String} type integration context type
		 * @param {Array} resources list of component resources
		 */
		integrateComponentsResources: function(jobid, type, resources){
			try {
				// _resources = resources;
				for(let i = 0; i < resources.length; ++i) {
					_resources.push(resources[i]);
				}

				// create component-instance-resources table
				// _components =
				// createComponentResourceTable(resources);
				let components = createComponentResourceTable(resources);
				let componentItems = [];
				for(let cid in components) {
					if(_components[cid]) {
						let entry = components[cid];
						for(let i = 0; i < entry.instances.length; ++i) {
							let instid = entry.instances[i];
							// fillup array of component items
							componentItems.push(new Documa.distribution.ComponentItem({
								id: instid,
								cid: cid
							}));
							// add instances to this registry entry
							_components[cid].instances.push(instid);
						}
					} else {
						_components[cid] = components[cid];
					}
				}

				// create runtime containers from table and
				// resource list
				_containersToLoad = createRuntimeContainers(components, resources);

				// append new container into existing
				// containers
				for(let i = 0; i < _containersToLoad.length; ++i) {
					_containers.push(_containersToLoad[i]);
				}
				// get integration job which represents the integration state
				let integrationjob = null;
				switch (type) {
					case Documa.components.ComponentIntegrationTypes.INITIATION:
						LOG.debug(TAG, "... starting component integration process during the application's loading phase!");
						// get integration job that represents the initial component integration
						integrationjob = this._integrationRegistry[jobid];
						if(!integrationjob) {
							// integration job was not started within the current runtime context --> create a new one
							this._integrationRegistry[jobid] = integrationjob = new Documa.components.integration.IntegrationJob(jobid, type, componentItems);
						}

						if(!integrationjob.getComponents()) {
							// initialize integration job at the beginning
							integrationjob.setComponents(componentItems);
						}
						break;
					case Documa.components.ComponentIntegrationTypes.MODIFICATION:
						LOG.debug(TAG, "... starting component integration process during a distribution modification at runtime!");
						integrationjob = this._integrationRegistry[jobid];
						if(!integrationjob)
							throw new Error("Could not determine integrationjob from id: " + id);
						break;
				}
				// ************************************
				// starting resource integrattion *****
				// ************************************
				startResourceLoading.call(_self, jobid);
			} catch (error) {
				LOG.trace(TAG, error);
			}
		},
		/**
		 * Register component descriptor for latter component
		 * integration procedure that start after all needed
		 * resources were injected successfully.
		 *
		 * @param {String} jobid
		 *            id of integration job
		 * @param {String} ctxtype
		 *            integration context type
		 * @param {DOMDocument} descriptor component descriptor in smcdl
		 *            format and in DOM representation
		 * @param {Array} channels set of channels required by
		 *            specified component
		 * @param {Object} compConfig default component configuration
		 *            as a associative array of key-value pairs
		 */
		registerComponent: function(jobid, ctxtype, descriptor, compConfig){
			let capabilities = _componentUtil.getComponentCapabilities(descriptor);
			let properties = _componentUtil.getComponentProperties(descriptor);
			let events = _componentUtil.getComponentEvents(descriptor);
			let operations = _componentUtil.getComponentOperations(descriptor);
			let componentInfo = _componentUtil.getComponentInfo(descriptor);
			let componentid = componentInfo.id;
			if(_componentRegistryToLoad[componentid]) {
				// component was already registered
				let value = _componentRegistryToLoad[componentid];

				// append component configuration
				value.configurations.push(compConfig);
			} else {
				let confs = [];
				confs.push(compConfig);
				// register new component here
				_componentRegistryToLoad[componentid] = {
					smcd: descriptor,
					configurations: confs,
					componentInfo: componentInfo,
					capabilities: capabilities,
					properties: properties,
					events: events,
					operations: operations
				};
			}

			// register integration context of current component instance
			_integrationHistory[compConfig.id] = ctxtype;

			// test if all components are already registered and
			// their resources are loaded
			if(!checkComponentContainers()) {
				LOG.debug(TAG, "... could not instantiate the components yet, because not all containers are ready!");
				return;
			}

			// all components are registered now and every
			// resource was loaded
			// instantiate all components now
			instantiateComponents.call(_self, jobid);
		},
		/**
		 * This is a callback method that is executed after all
		 * resource were determined on the server-side. The
		 * given parameter is a map that describes which
		 * resource URL is used by what component. The
		 * components are referenced by it's component id.
		 *
		 * @param {Array} resources list of all component resources
		 *            containing a list of dependent components
		 *            per resource entry
		 * @param {Object} components associative memory that
		 *            describe the mapping between the component
		 *            instances and the set of available
		 *            resources
		 * @param {Array} containers list of all instantiated
		 *            component instance container that
		 *            encapsulate a component instance execution
		 *            context from the rest of the runtime
		 *            environment
		 */
		onAllResourcesLoaded: function(jobid, resources, components, containers){
			LOG.debug(TAG, "All component resources loaded");

			// from the client-side runtime perspective the
			// INTEGRATECMP-command
			// is received at any time which means in worst case
			// the runtime has
			// to wait before every component was registered

			// two cases are possible:
			// 1st: client received all INTEGRATECMP-commands
			// already --> if
			// that's the case start instantiation
			//
			// 2nd: not all INTEGRATECMP-commands received -->
			// if that's the
			// case just do nothing component instantiation is
			// triggered during
			// the handling of the last received
			// INTEGRATECMP-command
			let integrationjob = this._integrationRegistry[jobid];
			if(!integrationjob)
				throw new Error("Could not determine integration job from job id: " + jobid);
			// check resources checkmark
			integrationjob.check(Documa.components.integration.CheckMarks.RESOURCES);

			// TODO Add check for case 2?
			instantiateComponents.call(_self, jobid);
		},
		/**
		 * Add described communication channel between already
		 * integrated components. The communication partners of
		 * are described in the channel command object.
		 *
		 * @param {Object} command object that describes the channel
		 *            to be integrated
		 */
		addChannel: function(channel){
			if(!( channel instanceof Documa.communication.channels.ComponentChannel)) {
				throw new Error("Invalid channel object.");
			}
			// set flag
			_noChannelsNeeded = false;
			// register channel object
			_channels[channel.getName()] = channel;
			if(!areAllComponentsInstantiated()) {
				// some components are not ready yet
				return;
			}
			// there are all components instantiated now
			integrateChannel.call(_self, channel);
		},
		/**
		 * Instantiated and initialize specified component. If
		 * the component's descriptor is already known the the
		 * component manager uses the dependency information as
		 * well as the constructor definition to create the
		 * component instance. Thereby, a new component
		 * container will be created.
		 *
		 * @param {String}
		 *            instid component's instance id
		 * @param {DOMDocument}
		 *            smcd component's interface descriptor
		 * @param {Function}
		 *            callback function that is executed after
		 *            the component was integrated successfully
		 * @param {Function}
		 *            callback function that is executed after
		 *            an error occurred during the component
		 *            integration
		 */
		addComponent: function(instid, smcd, successCb, errorCb){
			LOG.debug(TAG, "... adding component {" + instid + "#" + smcd.getAttribute("id") + "}");
			throw new Error("Not implemented yet!");
		},
		/**
		 * Request server to trigger the component integration
		 * process with respect to the defined components.
		 *
		 * @param {Documa.distribution.DistributionModification} modification
		 *                              modification of composition
		 *                              state with respect to the local
		 *                              distribution
		 * @param {IntegrationSuccessCallback} successCb
		 *                              success callback handler
		 * @param {ErrorCallback} errorCb
		 *                              error callback handler
		 */
		addComponents: function(modification, successCb, errorCb){
			LOG.debug(TAG, "... request INTEGRATION of several components!");
			// create integration job to determine integration completion
			let integrationJob = new Documa.components.integration.IntegrationJob(modification.getId(),
				Documa.components.ComponentIntegrationTypes.MODIFICATION, modification.getComponents());

			// TODO: check if there are component instances, which were already integrated
			// --> reduce communication overhead between client and server

			// register callback functions
			integrationJob.setSuccessCallback(successCb);
			integrationJob.setFailureCallback(errorCb);
			this._integrationRegistry[integrationJob.getId()] = integrationJob;

			//this._modificationRegistry[modification.getId()] = modification;
			let appcontext = Documa.RuntimeManager.getApplicationContext();
			let appid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
			let appversion = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
			let appinstid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);

			// create integration request command and send it to
			// the server
			appcontext.getDistributionManager().requestDistributionUpdate(modification)
				.then(function(distribution){
					// distribution state was successfully updated
					LOG.debug(TAG, "... distribution state updated successfully!");
				})
				.catch(function(error){
					LOG.error(TAG, "Error during distribution state update: " + error.stack);
					errorCb(error);
				});
			LOG.debug(TAG, "... sent integration request command to server!");
		},

		/**
		 * Removes component instance and its container using the given instance id.
		 *
		 * @param {String} instid id of component instance and its associated container
		 * @param {String} cid component id
		 */
		removeComponent: function(instid, cid){
			LOG.debug(TAG, "... removing component with instance id: " + instid);
			try {
				// 1st: determine container with given instid and delete it
				for(let i = 0; i < _containers.length; ++i) {
					/** @type {Documa.components.ComponentContainer} */
					let container = _containers[i];
					if(container.getComponentInstanceID() !== instid)
						continue;

					// release internal resources
					container.destroy();

					// remove container from current registry
					_containers.splice(i, 1);
					LOG.debug(TAG, "... container of component {" + instid + "} removed from internal registry!");
				}

				// remove instance from registries
				if(!_components[cid]) {
					throw new Error("Could not find any component from given parameters: {instance-id:" + instid + ", component-id:" + cid + "}");
				}

				LOG.debug(TAG, "... removing component instance.");
				/** @type Array */
				let instances = _components[cid].instances;
				for(let i = 0; i < instances.length; ++i) {
					if(instances[i] !== instid)
						continue;
					// remove instance element
					instances.splice(i, 1);
				}

				LOG.debug(TAG, "... removing component mediation config.");
				// remove mediation configs
				if(!_mediationConfigs[instid])
					throw new Error("Could not find any component from given parameters: {instance-id:" + instid + ", component-id:" + cid + "}");
				delete _mediationConfigs[instid];

				LOG.debug(TAG, "... removing component config.");
				// remove component instance configurations
				if(!_componentRegistry[cid])
					throw new Error("Could not find any component from given parameters: {instance-id:" + instid + ", component-id:" + cid + "}");

				/** @type Array */
				let configurations = _componentRegistry[cid].configurations;
				for(let i = 0; i < configurations.length; ++i) {
					let conf = configurations[i];
					if(instid !== conf.id)
						continue;

					// remove configurations
					configurations.splice(i, 1);
				}
				LOG.debug(TAG, "... removal of component {" + instid + "} completed!");

				// notify listener about changed composition state
				this.fireEvent(Documa.components.CompositionChangedEvents.REMOVED, instid);
			} catch (error) {
				LOG.error(TAG, error.stack);
				let uiman = Documa.RuntimeManager.getUIManager();
				uiman.showError(error.toString());
			}
		},

		/**
		 * Removes each components references by given distribution state modification object. Furthermore, it removes
		 * each corresponding communication channel for each component instance.
		 *
		 * @param {Documa.distribution.DistributionModification} modification includes set of migrated components
		 * @param {Function} successCb handler to be called after successfull component removal
		 * @param {Function} errorCb handler to be called on removal error
		 */
		removeComponents: function(modification, successCb, errorCb){
			let components = modification.getComponents();
			let eventBroker = Documa.RuntimeManager.getEventBroker();
			let layoutManager = Documa.RuntimeManager.getUIManager().getLayoutManager();
			try {
				for(let i = 0; i < components.length; ++i) {
					let citem = components[i];
					let container = this.getContainerElementById(citem.getInstanceId());
					if(!container) {
						LOG.debug(TAG, "Container of component: " + citem.getInstanceId() + " was not integrated!");
						continue;
					}
					// remove component from communication infrastructure
					eventBroker.removeChannelsFromComponent(citem.getInstanceId());

					// remove component from layouting infrastructure
					layoutManager.remove(container);

					LOG.debug(TAG, "... removing component {" + citem.getInstanceId() + "}!");
					// removing component instance
					this.removeComponent(citem.getInstanceId(), citem.getComponentId());
				}
				successCb(modification);
			} catch (error) {
				LOG.error(error.stack);
				errorCb(modification, error);
			}
		},
		/**
		 * Is called after the component with given instance id
		 * was instantiated.
		 *
		 * @param {String} jobid id of integration job
		 * @param {Documa.components.ComponentContainer} container component container of component instance
		 */
		onComponentInstantiated: function(jobid, container){
			try {
				let instid = container.getComponentInstanceID();
				let cid = container.getComponentID();

				// creates and publishes component lifecycle event to the server
				publishComponentInstantiatedEvent.call(this, instid);

				// map components mediation configuration
				// (derived from the smcdl) to components
				// instance-id
				_mediationConfigs[instid] = container.getMediationConfiguration();

				LOG.debug(TAG, "... component {" + instid + "} instantiated.");

				if(!areAllComponentsInstantiated()) {
					// some components are not ready yet
					return;
				}

				/** ******************************************************* */
				// all components are instantiated
				/** ******************************************************* */
					// set checkmarks on integration job
				let integrationJob = _self._integrationRegistry[jobid];
				if(!integrationJob)
					throw new Error("Could not determine integration job from id: " + jobid);
				// check instantiation checkmark
				integrationJob.check(Documa.components.integration.CheckMarks.INSTANTIATION);

				// check if there are some pending service
				// requests
				let serviceAccess = Documa.RuntimeManager.getServiceAccess();
				let pendingRequests = serviceAccess.getPendingInitialRequestsCount();

				// define handler function for 'all components
				// are ready'-state
				let onAllComponentsAreReady = function(){
					if(_noChannelsNeeded) {
						// in case of channel free applications,
						// e. g. one-component applications
						initializeAllComponents.call(_self, jobid, function(){
							LOG.debug(TAG, "... all components were initialized!");
							LOG.debug(TAG, "... releasing temporary integration resources!");
							// reset load list for future integration process
							_componentRegistryToLoad = {};

							// release all resources
							_containersToLoad = null;
						});
						integrationJob.check(Documa.components.integration.CheckMarks.COUPLING);
					} else {
						// check if all channels required to be
						// coupled to the component were added
						// for this the client should compare
						// the status quo with a target state
						// describing the component coupling
						// start component channel integration
						let eventBroker = Documa.RuntimeManager.getEventBroker();
						let allChannelsAdded = true;

						// check that each container is coupled with corresponding
						// communication partners
						for(let j = 0; j < _containersToLoad.length; ++j) {
							let container = _containersToLoad[j];
							let iid = container.getComponentInstanceID();
							let cnid = container.getComponentID();

							// get component config and get
							// channel endpoints
							let compConfig = _self.getComponentConfig(cnid, iid);
							if(!compConfig || !compConfig.channelpts) {
								throw new Error("Invalid component configuration detected!");
							}

							// determine required channel endpoints
							// defined as entry in the component
							// configuration
							for(let i = 0; i < compConfig.channelpts.length; ++i) {
								let entry = compConfig.channelpts[i];
								if(!(entry.eptype && entry.channel)) {
									throw new Error("Invalid channel endpoint config of component {" + iid + "#" + cnid + "} detected!");
								}
								if(!eventBroker.wasChannelAdded(entry.channel)) {
									LOG.debug(TAG, "... channel {" + entry.channel + "} not added!");
									allChannelsAdded = false;
									break;
								} else {
									// start updating subscriptions
									let channel = eventBroker.getChannel(entry.channel);
									if(!channel)
										throw new Error("Could not find channel " + entry.channel);

									// remove old subscriptions and renew them
									// --> required in migration scenarios
									eventBroker.updateSubscriptions(channel);
								}
							}
						}

						if(!allChannelsAdded) {
							// there is at least a missing channel
							LOG.debug(TAG, "... starting to integrate missing channels!");
							integrateChannels.call(_self, jobid);
						} else {
							// this case is possible if a component was integrated that requires channels to communicate
							// with other components --> channels were already added previously
							LOG.debug(TAG, "... all required channels were added already!");
							integrationJob.check(Documa.components.integration.CheckMarks.COUPLING);
							initializeAllComponents.call(_self, jobid, function(){
								LOG.debug(TAG, "... all components were initialized!");
								LOG.debug(TAG, "... releasing temporary integration resources!");
								// reset load list for future integration process
								_componentRegistryToLoad = {};

								// release all resources
								_containersToLoad = null;
							});
						}
					}

				};

				if(pendingRequests > 0) {
					// there are still some initial pending
					// service requests fired by components
					// during the instantiation phase
					serviceAccess.onInitialRequestsFinished(onAllComponentsAreReady);
				} else {
					// all components are ready --> start
					// channel integration in case of
					// communication channels
					onAllComponentsAreReady();
				}
			} catch (error) {
				LOG.error(TAG, error.stack);
			}
		},
		/**
		 * Method is called after the specified channel was
		 * registered and attached to its sender and receiver
		 * component.
		 *
		 * @param {String} jobid integration job id
		 * @param {Documa.communication.channels.ComponentChannel} channel component channel instance
		 */
		onChannelAdded: function(jobid, channel){
			try {
				LOG.debug(TAG, "... channel {" + channel.getName() + "} added successfully.");

				if(!allComponentsIntegrated()) {
					LOG.debug(TAG, "... not all channels were added. Therefore, could not start with component initialization.");
					return;
				}
				// *************************************************************************************
				// component coupling finished *********************************************************
				// *************************************************************************************
				LOG.debug(TAG, "... all channel were added. Starting with component initialization ...");

				// get current integration job from integration job reference
				let integrationJob = this._integrationRegistry[jobid];
				if(!integrationJob)
					throw new Error("Could not determine integration job from id: " + jobid);

				// check coupling checkmark
				integrationJob.check(Documa.components.integration.CheckMarks.COUPLING);

				// all channels are registered
				initializeAllComponents.call(_self, jobid, function(){
					LOG.debug(TAG, "... all components were initialized!");
					LOG.debug(TAG, "... releasing temporary integration resources!");
					// reset load list for future integration process
					_componentRegistryToLoad = {};

					// release all resources
					_containersToLoad = null;
				});
			} catch (error) {
				LOG.trace(TAG, error);
			}
		},
		/**
		 * Method is called if the server detects a
		 * communication model without any channels, e. g. in
		 * the case of simple one-component-applications.
		 *
		 * @param {String} jobid id of integration job
		 */
		initializeComponentsWithoutChannels: function(jobid){
			LOG.debug(TAG, "... start initializing components without channels");
			_noChannelsNeeded = true;

			if(!areAllComponentsInstantiated.call(_self)) {
				LOG.debug(TAG, "... not all components are instantiated yet.");
				return;
			}

			// start initialization of components
			initializeAllComponents.call(_self, jobid, function(){
				LOG.debug(TAG, "... all components were integrated!");

				LOG.debug(TAG, "... releasing temporary integration resources!");
				// reset load list for future integration process
				_componentRegistryToLoad = {};

				// release all resources
				_containersToLoad = null;
			});
		},
		/**
		 * This method is called after the specified container
		 * and its component instance were initialized, i. e.
		 * the default component configuration is activated.
		 *
		 * @param {String} jobid integration job id
		 * @param {Documa.components.ComponentContainer} container object containing and managing initialized component instance
		 */
		onComponentInitialized: function(jobid, container){
			try {
				let instid = container.getComponentInstanceID();
				LOG.debug(TAG, "... component {" + instid + "} initialized.");

				// send event to server-side runtime event
				publishComponentInitializedEvent(instid);

				// Call the client's Access Control Manager to
				// check user's rights to each NEW
				// integrated instance and its properties
				Documa.RuntimeManager.getAccessControlManager().userAccessRightControl(container.getComponentInstanceID());

				// notify lister-objects
				this.fireEvent(Documa.components.CompositionChangedEvents.ADDED, container);

				// check if all components were initialized
				if(!areAllComponentsInitialized.call(_self)) {
					return;
				}
				LOG.debug(TAG, "... all components are initialized.");

				_self.onAllComponentsInitialized(jobid);
			} catch (error) {
				LOG.error(TAG, error.stack);
			}
		},
		/**
		 * This method is called after all components were
		 * initialized in the context of the containers.
		 *
		 * @param {String} jobid id of component integration job
		 */
		onAllComponentsInitialized: function(jobid){
			LOG.debug(TAG, "... all integrated components initialized!");
			try {
				// move newly integrated components into registry of all integrated components
				for(let cid in _componentRegistryToLoad) {
					if(!_componentRegistry[cid]) {
						_componentRegistry[cid] = _componentRegistryToLoad[cid];
					} else {
						for(let k = 0; k < _componentRegistryToLoad[cid].configurations.length; k++) {
							let compConfigToLoad = _componentRegistryToLoad[cid].configurations[k];
							_componentRegistry[cid].configurations.push(compConfigToLoad);
						}
					}
				}

				let newInitializedInstances = [];
				for(let i = 0; i < _containersToLoad.length; i++) {
					newInitializedInstances.push(_containersToLoad[i].getComponentInstanceID());
					_allInitializedInstances.push(_containersToLoad[i].getComponentInstanceID());
				}

				LOG.debug(TAG, "... new initialized instances: " + newInitializedInstances);
				LOG.debug(TAG, "... all initialized instances during the whole session: " + _allInitializedInstances);

				// perform initial state transition operations
				// if already received
				if(_initStateTransitionOperations) {
					_self.performInitialStateTransition(_initStateTransitionOperations);
				}

				// get current integration job
				let integrationJob = this._integrationRegistry[jobid];
				if(!integrationJob)
					throw new Error("Could not determine integration job with id: " + jobid);

				// get layout manager from ui manager
				let layoutManager = Documa.RuntimeManager.getUIManager().getLayoutManager();

				// check initialization flag
				integrationJob.check(Documa.components.integration.CheckMarks.INITIALIZATION);
				// check the integration context type
				switch (integrationJob.getType()) {
					case Documa.components.ComponentIntegrationTypes.INITIATION:
						LOG.debug(TAG, "... finished component integration during application loading process!");

						// show layout selection ui
						layoutManager.showSelectionUI(function(selectedStrategy){
							// executed after user has selected an available layout strategy
							LOG.debug(TAG, "... starting layout components!");
							// all components are initialized now - time for layout :D!
							// layout all components
							layoutManager.layoutComponents();
						});
						break;
					case Documa.components.ComponentIntegrationTypes.MODIFICATION:
						LOG.debug(TAG, "... finished component integration during distribution modification process!");

						// all components are initialized now - time for layout :D!
						// layout all components
						layoutManager.layoutComponents();
						// ****************************************
						// blocking integrated containers *********
						// ****************************************
						for(let i = 0; i < integrationJob.getComponents().length; ++i) {
							let citem = integrationJob.getComponents()[i];
							if(!( citem instanceof Documa.distribution.ComponentItem))
								throw new Error("Invalid component item detected!");

							// get container from component item
							let container = this.getContainerElementById(citem.getInstanceId());
							if(!container)
								throw new Error("Could not determine container from instance id: " + citem.getInstanceId());
							// start block
							container.block();
						}

						// finished a component integration during a
						// distribution change transaction
						// get success callback from integration job and call it
						let successCb = integrationJob.getSuccessCallback();
						// executing callback
						successCb(integrationJob);
						break;
				}
			} catch (error) {
				LOG.error(TAG, error.stack);
			}
		},
		/**
		 * Returns array of initialized components.
		 * @returns {Array}
		 */
		getAllInitializedInstances: function(){
			return _allInitializedInstances;
		},
		/**
		 * Returns the array store of successfully initialized
		 * components ([instance id, component id] pairs) during
		 * the WHOLE session of dynamic sharing. It is used by
		 * the Coordination Manager to display possible
		 * components to share in the sharing window.
		 *
		 * @return {Ext ArrayStore} array store of initialized
		 *         components
		 */
		getComponentsStore: function(){
			let initializedComponentsStore = new Ext.data.ArrayStore({
				autoDestroy: true,
				fields: ['id', 'name']
			});
			let initializedComponents = [];
			for(let i = 0; i < _containers.length; i++) {
				initializedComponents.push([_containers[i].getComponentInstanceID(), _containers[i].getComponentID()]);
			}
			initializedComponentsStore.loadData(initializedComponents);
			return initializedComponentsStore;
		},

		/**
		 * Returns an array of service component information. The information objects have an instanceId, a name
		 * and a picture property.
		 *
		 * @return {[{instanceId, name, picture]} The array of service component information
		 */
		getServiceComponents: function(){
			let serviceComponents = [];
			for(let componentId in _componentRegistry) {
				let component = _componentRegistry[componentId];
				if(component.componentInfo.isUi === "false") {
					for(let i = 0; i < component.configurations.length; i++) {
						let entry = {
							"instanceId": component.configurations[i].id,
							"name": component.componentInfo.name,
							"picture": component.componentInfo.icon
						};
						serviceComponents.push(entry);
					}
				}
			}
			return serviceComponents;
		},

		/**
		 * Method to return all properties names of the defined
		 * instance.
		 *
		 * @param {String}
		 *            instance component instance id
		 * @return {Array} array of properties names
		 */
		getInstancePropertiesNames: function(instance){
			let propertiesNames = [];
			// iterating over each component
			for(let cid in _componentRegistry) {
				let regEntry = _componentRegistry[cid];
				for(let i = 0; i < regEntry.configurations.length; ++i) {
					let compConfig = regEntry.configurations[i];
					let instid = compConfig.id;
					if(instid === instance) {
						let properties = compConfig.properties;
						for(let property in properties) {
							propertiesNames.push(property);
						}
					}
				}
			}
			return propertiesNames;
		},
		/**
		 * This method is called after all components were
		 * initialized in the context of the containers.
		 */
		onLayoutInitialized: function(){
			LOG.debug(TAG, "... layout initialized");
			// TODO: add layout initialized handling behaviour
			// here
		},
		/**
		 * Called after the LayoutManager has calculated the
		 * layout. All components are ready for rendering.
		 */
		onLayoutCompleted: function(){
			LOG.debug(TAG, "... layout calculation completed!");

			// start component rendering
			showAllComponents.call(_self);

			let uiManager = Documa.RuntimeManager.getUIManager();
			//when component gets integrated, refresh layout of active view
			if(uiManager.getActiveView() != null) {
				uiManager.getActiveView().updateView();
			}
		},
		/**
		 * Returns the mapping between the set of component
		 * class ids and the corresponding mediation
		 * configuration
		 *
		 * @return {Object} mediation confiurations map
		 */
		getMediationConfig: function(){
			return _mediationConfigs;
		},
		/**
		 * Returns true if the application component with the
		 * specified component class id is a UI component. If
		 * not, the method returns false.
		 *
		 * @param {String}
		 *            cid component id to determine component
		 *            nature from
		 *
		 * @return {Boolean}
		 */
		isUIC: function(cid){
			if(!( cid instanceof String))
				throw new Error("Invalid component id argument.");

			// iterate over all containers
			for(let i = 0; i < _containers.length; ++i) {
				let container = _containers[i];
				if(cid === container.getComponentID()) {
					return container.isUI();
				}
			}

			// no specified component found - something went
			// wrong
			throw new Error("Could not found component from given component id {" + cid + "}");
		},
		/**
		 * Returns corresponding iframe container from component
		 * instance.
		 *
		 * @param {Object}
		 *            instance component instance
		 * @return {DOMIFrame}
		 */
		getContainerElement: function(instance){
			if(!instance)
				throw new Error("Invalid instance argument specified");

			for(let i = 0; i < _containers.length; ++i) {
				let container = _containers[i];
				if(instance === container.getComponentInstance()) {
					return container.getContainerElement();
				}
			}
			return null;
		},
		/**
		 * Returns corresponding component container from given
		 * component instance.
		 *
		 * @param {Object}
		 *            componentInstance
		 * @return {Documa.components.ComponentContainer}
		 */
		getContainerFromComponent: function(componentInstance){
			if(!componentInstance)
				throw new Error("Invalid instance argument specified");

			// search for matching component instance
			for(let i = 0; i < _containers.length; ++i) {
				let container = _containers[i];
				if(componentInstance === container.getComponentInstance()) {
					return container;
				}
			}
			return null;
		},
		/**
		 * Returns container from components instance id.
		 *
		 * @param {String}
		 *            instanceID instance id of component and
		 *            its container
		 * @return {Documa.components.ComponentContainer}
		 *         container instance associated to id of
		 *         component instance
		 */
		getContainerElementById: function(instanceID){
			if(!instanceID)
				throw new Error("Invalid instance argument specified");

			// iterate over set of component container
			for(let i = 0; i < _containers.length; ++i) {
				let container = _containers[i];
				if(instanceID === container.getComponentInstanceID()) {
					return container;
				}
			}
			return null;
		},
		/**
		 * Helper method to return instance object of a given
		 * instance id - similar to the getComponentInstance
		 * method
		 *
		 * @param {String}
		 *            instid component's instance id to
		 *            determine component nature from
		 * @return {Instance Object}
		 */
		getInstance: function(instid){
			if(( typeof instid) !== 'string') {
				throw new Error("Invalid component id argument.");
			}

			// iterate over all containers
			for(let i = 0; i < _containers.length; ++i) {
				let container = _containers[i];
				if(instid === container.getComponentInstanceID()) {
					return container.getComponentInstance();
				}
			}

			// no specified component found - something went
			// wrong
			throw new Error("Could not found instance from given instance id {" + instid + "}");
		},
		/**
		 * Returns the default configuration of the component
		 * instance represented by the given instance-id. The
		 * result is a value object containing the components
		 * default property values.
		 *
		 * @param {String}
		 *            cid component class id
		 * @param {String}
		 *            instid component instance-id
		 * @return {Object} default configuration values
		 */
		getComponentConfig: function(cid, instid){
			if(!(_componentRegistry || _componentRegistry[cid]) && !(_componentRegistryToLoad || _componentRegistryToLoad[cid])) {
				throw new Error("Could not determine component configuration from specified component identifier.");
			}

			/*
			 * let compConfig = regEntry.configurations[i]; var
			 * instid = compConfig.id;
			 */
			let cmpEntry = null;
			if(_componentRegistryToLoad[cid]) {
				cmpEntry = _componentRegistryToLoad[cid];
			} else {
				cmpEntry = _componentRegistry[cid];
			}

			for(let i = 0; i < cmpEntry.configurations.length; ++i) {
				let config = cmpEntry.configurations[i];
				if(config.id === instid) {
					return config;
				}
			}
			LOG.warn(TAG, "... could not determine default configuration from component {" + cid + "}{" + instid + "}");
			return null;
		},
		/**
		 * This method should trigger the initial state
		 * transition of all components after they were
		 * instantiated and initialized (default configurations
		 * are set). It should be noted that this method can be
		 * called at any time, i. e. it should be checked that
		 * the component manager has reached the right state
		 * (all components are initialized and linked according
		 * to the communication model).
		 *
		 * @param {Array}
		 *            operations list of all operations that
		 *            shoud be performed to reach the initial
		 *            state
		 */
		performInitialStateTransition: function(operations){
			_initStateTransitionOperations = operations;
			if(!areAllComponentsInitialized.call(_self)) {
				return;
			}

			for(let i = 0; i < _initStateTransitionOperations.length; ++i) {
				let op = _initStateTransitionOperations[i];
				if(!op instanceof Documa.communication.protocol.Operation) {
					throw new Error("Invalid element found in operations list.");
				}

				let instid = op.getComponentInstanceId();
				let container = getContainer(instid);

				// invoke initial state transition operation
				container.invokeOperation(op);
			}
		},
		/**
		 * Returns true if all components are instantiated, else
		 * false.
		 *
		 * @return {boolean}
		 */
		areComponentsInstantiated: function(){
			if(!_containers) {
				return false;
			}

			for(let i = 0; i < _containers.length; ++i) {
				let container = _containers[i];
				if(container.getComponentInstance() === null) {
					return false;
				}
			}

			return true;
		},
		/**
		 * Returns array of current component containers.
		 * @returns {Array.<Documa.components.ComponentContainer>}
		 */
		getContainers: function(){
			return _containers;
		},
		/**
		 * Returns integration context from defined component instance.
		 * Possible values are: 'initiation','modification' and 'extension'.
		 *
		 * @return {String} value of integration context type
		 */
		getIntegrationType: function(instid){
			return _integrationHistory[instid];
		},
		/**
		 * Returns the SMCDL of a component specified by it's
		 * component id (cid).
		 *
		 * @param {String}
		 *            cid id of component to retrieve its
		 *            descriptor
		 * @return {DOMDocument} smcdl descriptor as document
		 *         object
		 */
		getComponentDescriptor: function(cid){
			// 1st search for a local smcdl
			for(let i = 0; i < _containers.length; ++i) {
				let current = _containers[i];
				if(cid === current.getComponentID()) {
					return current.getDescriptor();
				}
			}

			// no local container could be detected -->
			// component is unknown to this client
			// request server-side component manager for smcdl,
			// e. g. during the case of
			// presenting distribution state information
			return null;
		},

		getCapabilities: function(currentComponentID){
			let caps = _componentRegistry[currentComponentID].capabilities;
			return caps;
		},

		getProperties: function(currentComponentID){
			let props = _componentRegistry[currentComponentID].properties;
			return props;
		},

		/**
		 * Method to get Component Information saved in the component registry
		 *
		 *
		 */
		getComponentInfo: function(currentComponentID){
			if(!_componentRegistry || !_componentRegistry[currentComponentID])
				throw new Error("Could not determine component configuration from specified component identifier.");
			let componentInfo = _componentRegistry[currentComponentID].componentInfo;
			return componentInfo;
		},

		getEvents: function(currentComponentID){
			let events = _componentRegistry[currentComponentID].events;
			return events;
		},

		getOperations: function(currentComponentID){
			let operations = _componentRegistry[currentComponentID].operations;
			return operations;
		},
		
		/**
		 *
		 * @param {Array.<String>} cidarray array of component ids
		 * @param {boolean} includesInsts flag if false previous array does not include component instance ids
		 * @param {Function} successCb response handler function
		 *            executed after the response message was
		 *            received successfully
		 * @param {Function} errorCb handler function executed after an
		 *            error occured during the request
		 */
		requestRemoteDescriptors: function(cidarray, includesInsts, successCb, errorCb) {
			let cmd = getDescriptorRequestCommand.call(this, cidarray, includesInsts);

			// add response handler into request registry for
			// later response handling
			// getting timestamp from command and save response
			// handler of request --> response must be
			// identified by it's timestamp
			_pendingDescriptorRequests[cmd.getTimestamp()] = {
				success: successCb,
				error: errorCb
			};

			// getting communication manager to send request
			// command to server-side
			Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(cmd);
			LOG.debug(TAG, "... sent component descriptor request command to server!");
		},
		/**
		 * Is called after a an response event from server-side
		 * was received by the communication manager.
		 *
		 * @param {Documa.communication.events.Event}
		 *            event server-side event
		 */
		handleEvent: function(eventObj){
			if(!eventObj.payload)
				throw new Error("Invalid event, no payload available!");
			// TODO: handle event --> make sure that the
			// descriptor event has a timestamp attribute to
			// identify the previous request-handler-object
			switch (eventObj.getMessageTag()) {
				case Documa.communication.events.ApplicationEvents.ON_REQSMCDLS:
					LOG.debug(TAG, "... received component descriptor request-response message from server-side runtime environment!");
					// getting request timestamp as request
					// identifier
					let responseObject = new Documa.communication.events.DescriptorReqResponse(eventObj.payload);
					if(!_pendingDescriptorRequests[responseObject.getRequestTimestamp()]) {
						LOG.error(TAG, "No waiting response handler available!");
						return;
					}
					LOG.debug(TAG, "... handling descriptors response event");
					_pendingDescriptorRequests[responseObject.getRequestTimestamp()].success(responseObject);
					break;
				default:
					throw new Error("Not implemented yet!");
			}
		},

		/**
		 * Returns the component utility object
		 */
		getComponentUtil: function(){
			return _componentUtil;
		},
		/**
		 * Function, that returns the appropriate cid of a component instance id
		 *
		 * @param {String} instId The component intance id
		 * @return {String} The cid
		 */
		getCid: function(instId){
			for(let cid in _componentRegistry) {
				let conf = _componentRegistry[cid].configurations;
				for(let i = 0; i < conf.length; i++) {
					let temp = conf[i];
					if(temp.id === instId) {
						return cid;
					}
				}
			}
			for(let cid in _componentRegistryToLoad) {
				let conf = _componentRegistryToLoad[cid].configurations;

				for(let i = 0; i < conf.length; i++) {
					let temp = conf[i];
					if(temp.id === instId) {
						return cid;
					}
				}
			}
			throw new Error("Could not find the instanceId " + instId + ".");
		}

	};
})());
