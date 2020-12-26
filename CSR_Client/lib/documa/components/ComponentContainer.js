Ext.namespace("Documa.components");

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.components.ApplicationEventProxy');
Documa.require('Documa.components.RuntimeEventProxy');
Documa.require('Documa.components.ServiceAccessEventProxy');
Documa.require('Documa.components.ComponentLoadingState');
Documa.require('Documa.components.ComponentEventBuffer');
Documa.require('Documa.components.ComponentCheckpoint');
Documa.require('Documa.components.ComponentContext');
Documa.require('Documa.components.ServiceResponseEvent');
Documa.require('Documa.communication.xhr.XHRFactory');

/**
 * @typedef {Function} InitFunction
 * @param {Documa.components.ComponentContext} ctxt
 */

/**
 * @typedef {Function} PropertySetter
 * @param {String} key
 * @param {String|Number} value
 */

/**
 * @typedef {Function} PropertyGetter
 * @param {String} key
 * @returns {String|Number}
 */

/**
 * @typedef {Function} OperationInvoker
 * @param {String} operationName
 * @param {Documa.components.ComponentMessage}
 */

/**
 * @typedef {Object} ComponentType
 * @property {InitFunction} init
 * @property {Function} dispose
 * @property {Function} show
 * @property {Function} hide
 * @property {Function} enable
 * @property {Function} disable
 * @property {PropertySetter} setProperty
 * @property {PropertyGetter} getProperty
 * @property {OperationInvoker} invokeOperation
 * @property {Function} prepare
 * @property {Function} unprepare
 */


Documa.components.ComponentContainerStates = {
	CONSTRUCTED: 0,
	LOADED: 1,
	INSTANTIATED: 2,
	INITIALIZED: 3,
	ACTIVE: 4,
	BLOCKED: 5,
	STATERECVRY: 6
};

/**
 * @class
 */
Documa.components.ComponentContainer = Ext.extend(Object, (function () {
	const TAG = "Documa.components.ComponentContainer";
	const JS = "javascript";
	const CSS = "css";

	/** Maximum component initialization duration in milliseconds.*/
	var INIT_TIMEOUT = 10000;
	var PREPARE_TIMEOUT = 10000;

	var _log = Documa.util.Logger;
	var _util = Documa.util.Util;

	/**
	 * Add all resources of the specified html document into the iframe and append
	 * the documents ui information into
	 * the iframes body.
	 */
	var processHtml = function (scope, iframe, htmlString, callback) {
		var head = iframe.contentDocument.getElementsByTagName('head')[0];
		var body = iframe.contentDocument.getElementsByTagName('body')[0];
		var root = document.createElement('html');
		root.innerHTML = htmlString;

		var links = root.getElementsByTagName('link');
		var metas = root.getElementsByTagName('meta');
		var head = root.getElementsByTagName('head')[0];
		var scripts = head.getElementsByTagName('script');
		var newbody = root.getElementsByTagName('body')[0];

		appendTo(head, metas);
		appendLinks(scope, iframe, 0, links, function () {
			appendScripts(scope, iframe, 0, scripts, function () {
				for (var i = 0; i < newbody.childNodes.length; ++i) {
					var child = newbody.childNodes.item(i).cloneNode(true);
					body.appendChild(child);
				}
				callback.call(scope);
			});
		});
	};

	/**
	 * Helper method to load all resources.
	 *
	 * @param {String} cid component id
	 * @param {DOMIFrame} iframe component runtime container in that all resources are
	 *            loaded
	 * @param {Integer} index current index of the resource entry to load
	 * @param {Array} resources array containing entries, which describe the
	 *            resource language and the URL
	 * @param {Function} callback function to be called when all resources are loaded
	 *            successfully
	 */
	var integrateResources = function (scope, jobid, cid, iframe, index, resources, callback) {
		if (index >= resources.length) {
			scope._ready = true;
			scope._currentState = Documa.components.ComponentContainerStates.LOADED;
			callback.call(scope, jobid, cid, iframe, resources);
			return;
		}

		var entry = resources[index];
		_log.debug(TAG, "... injecting resource {" + entry.path + "} in container of component {" + cid + "}");
		switch (entry.language.toLowerCase()) {
			case CSS :
				// css processing
				// *******************************************************
				var link = iframe.contentDocument.createElement("link");
				link.type = "text/css";
				link.rel = "stylesheet";

				if (link.readyState) {
					link.onreadystatechanged = function () {
						try {
							if (link.readyState === "loaded" || link.readystate === "complete") {
								link.onreadystatechange = null;
								// integrate next component resource
								integrateResources(scope, jobid, cid, iframe, ++index, resources, callback);

								// calculating loading state of component resources
								scope._componentLoadingState.setProgress((index / resources.length));
							}
						} catch (error) {
							_log.error(TAG, error.stack);
						}
					};
				} else {
					link.onload = function () {
						try {
							// integrate next component resource
							integrateResources(scope, jobid, cid, iframe, ++index, resources, callback);

							// calculating loading state of component resources
							scope._componentLoadingState.setProgress((index / resources.length));
						} catch (error) {
							_log.error(TAG, error.stack);
						}
					};
				}

				link.href = entry.path;
				iframe.contentDocument.getElementsByTagName('head')[0].appendChild(link);
				break;
			case JS :
				// javascript processing
				// ************************************************
				var script = iframe.contentDocument.createElement("script");
				script.type = "text/javascript";

				if (script.readyState) {
					script.onreadystatechanged = function () {
						if (script.readyState === "loaded" || script.readystate === "complete") {
							script.onreadystatechange = null;
							if (entry.path.indexOf('maps.google.com/maps/api/js') > 0) {
								return;
							}
							integrateResources(scope, jobid, cid, iframe, ++index, resources, callback);
							// calculating loading state of component resources
							scope._componentLoadingState.setProgress((index / resources.length));
						}
					};
				} else {
					script.onload = function () {
						if (entry.path.indexOf('maps.google.com/maps/api/js') > 0) {
							return;
						}
						integrateResources(scope, jobid, cid, iframe, ++index, resources, callback);
						// calculating loading state of component resources
						scope._componentLoadingState.setProgress((index / resources.length));
					};
				}

				if (entry.path.indexOf('maps.google.com/maps/api/js') > 0) {
					// library is google maps api - special handling required
					iframe.contentWindow.mapsLoaded = function () {
						window.google = this.google;
						integrateResources(scope, jobid, cid, iframe, ++index, resources, callback);
					};

					var end = null;
					if (entry.path.indexOf('?') > -1) {
						// contains some parameter already
						end = '&callback=mapsLoaded';
					} else {
						end = '?callback=mapsLoaded';
					}
					entry.path += end;
				}

				script.src = entry.path;
				iframe.contentDocument.getElementsByTagName('head')[0].appendChild(script);
				break;
		}
	};

	/**
	 * Helper method to get the component constructor code from given component
	 * descriptor.
	 *
	 * @param {DOMElement}
	 *            smcd component descriptor
	 */
	var getConstructorCode = function (smcd) {
		var binding = smcd.querySelector("binding");
		var constructorCode = "";
		if (!binding)
			throw new Error("Component descriptor does not contain any binding definitions");

		var templateCode = binding.querySelector("constructor > code").firstChild.nodeValue;
		constructorCode = Ext.cruise.client.expandTemplateCode(templateCode, smcd, 'instance', null)[0];
		constructorCode += ";";
		return constructorCode;
	};

	/**
	 * creates a div element with generated ID and returns the ID
	 *
	 * @function
	 * @private
	 */
	var createRenderTarget = function (cid) {
		var body = this._container.contentDocument.getElementsByTagName('body')[0];
		var div = document.createElement("div");
		var cName = cid.replace(/\/|:|#|\./g, '');
		var id = "div" + cName + Math.round(Math.random() * 100000);
		div.setAttribute("id", id);
		div.style.width = "100%";
		div.style.height = "100%";

		// check if the iframe already contains some elements, e. g. in the case a
		// component use a declarative
		// html ui descriptions
		var size = body.childNodes.length;

		if (size > 0) {
			for (var i = 0; i < size; ++i) {
				var child = body.childNodes.item(0);
				div.appendChild(child);
			}
		}

		body.appendChild(div);
		return id;
	};

	/**
	 * Shows block panel.
	 */
	function showBlockPanel() {
		if (!this._blockpanel) {
			this._blockpanel = new Ext.LoadMask(this._containerPanel.getId(), {
				msg: "Preparing ..."
			});
		}
		this._blockpanel.show();
	}

	/**
	 * Hides block panel.
	 */
	function hideBlockPanel() {
		this._blockpanel.hide();
	}

	/**
	 * Creates a default style for the component initialization
	 *
	 * @function
	 * @private
	 * @return {Ext.cruise.client.BaseContext} Default Style object
	 */
	var createDefaultStyle = function () {
		var def = Ext.cruise.client.BaseContext.PREDEFINED_ATT_NAMES.Style;
		var style = new Ext.cruise.client.BaseContext(def);
		style.setAttribute(def.FSIZE, "10pt");
		style.setAttribute(def.COLOR, "black");
		style.setAttribute(def.BGCOLOR, "white");
		return style;
	};

	/**
	 * @function
	 * @private
	 * @param {Ext.cruise.client.CommunicationProxy}
	 *            proxy the proxy of the component
	 * @param {String}
	 *            rtid the rendering target of an UI component
	 * @return {Ext.cruise.client.BaseContext} new context
	 */
	var createComponentContext = function (proxy, rtid) {
		//var _def = Ext.cruise.client.BaseContext.PREDEFINED_ATT_NAMES.ComponentContext;
		//var ctx = new Ext.cruise.client.BaseContext(_def);
		var _def = Documa.components.ContextConstants;
		var ctx = new Documa.components.ComponentContext(_def);
		var compStyle = createDefaultStyle();
		ctx.setAttribute(_def.LOG, _log);
		ctx.setAttribute(_def.EVENTHANDLER, proxy);
		ctx.setAttribute(_def.SERVICEACCESS, Documa.RuntimeManager.getServiceAccess());
		ctx.setAttribute(_def.ERRORHANDLER, proxy);
		ctx.setAttribute(_def.LCMANAGER, proxy);
		ctx.setAttribute(_def.STYLE, compStyle);
		ctx.setAttribute(_def.RTID, rtid);
		ctx.setAttribute(_def.XMLUTIL, Ext.cruise.client.Utility);
		ctx.setAttribute(_def.EVENTBUFFER, this._inputEventBuffer);
		ctx.setAttribute("CONTEXTMANAGER", Documa.RuntimeManager.getContextManager());
		return ctx;
	};
	/**
	 * Setting initial component property values defined in the application model or in its corresponding descriptor.
	 *
	 * @param {Object} compConfig
	 *                      key-value map of component properties
	 *                      defined in the application model
	 * @param {Object} defProps
	 *                      key-value map of component properties
	 *                      defined in the interface description
	 */
	var setProperties = function (compConfig, defProps) {
		if (!this._instance.setProperty)
			throw new Error("No 'setProperty'-operation implemented in component: " + this._instid + "#" + this._cid);

		var instid = compConfig.id;
		var props = compConfig.properties;
		// check if there is a property in default config that is not existing in the
		// component config from the composition model
		for (var key in defProps) {
			if (!props[key]) {
				props[key] = defProps[key];
			}
		}
		// iterate over every component config from application model
		for (var key in props) {
			var value = props[key];
			if (!value) {
				value = defProps[key];
			}
			if (!value) {
				_log.warn(TAG, "Could not determine default component configuration.");
				continue;
			}
			value = unescape(value);
			_log.debug(TAG, "... setting property {" + key + "} to value {" + value + "} to component instance {" + instid + "}");
			try {
				// setting properties
				this._instance.setProperty(key, value);
				switch (key) {
					case "width":
						this._width = parseInt(value);
						_log.debug(TAG, "... {" + this._instid + "#" + this._cid + "} initialize width: " + this._width);
						break;
					case "height":
						this._height = parseInt(value);
						_log.debug(TAG, "... {" + this._instid + "#" + this._cid + "} initialize height: " + this._height);
						break;
					case "title":
						this._title = value;
						this._containerPanel.setTitle(value);
						_log.debug(TAG, "... {" + this._instid + "#" + this._cid + "} initialize title: " + this._title);
						break;
				}
			} catch (error) {
				_log.error(TAG, "... error during setting of component {" + instid + "} property {" + key + "} to value {" + value + "}");
			}
		}
	};
	/**
	 * Returns a list of default property values from given smcdl component
	 * descriptor.
	 *
	 * @param {Document} smcd
	 *                      component descriptor in smcdl format
	 */
	var getDefaultProperties = function (smcd) {
		var props = smcd.querySelectorAll("property");
		var resultSet = {};
		for (var i = 0; i < props.length; ++i) {
			var cur = props[i];
			var name = cur.getAttribute("name");
			var value = null;

			// their is only one default value per property
			var defaultElem = cur.querySelector("default");

			if (!defaultElem) {
				resultSet[name] = null;
				continue;
			}

			if (defaultElem.childNodes.length == 1) {
				var c0 = defaultElem.childNodes[0];
				if (c0.nodeType == 3 || c0.nodeType == 4) {// TEXT or CDATA
					value = c0.nodeValue;
				}
			} else {
				// complex data structure as default value in smcd
				var node = null;
				for (var vnc = 0; vnc < defaultElem.childNodes.length; ++vnc) {
					if (defaultElem.childNodes[vnc].nodeType == 1) {// ELEMENT_NODE
						node = defaultElem.childNodes[vnc];
						break;
					}
				}
				if (!node) {
					// default-element is empty
					resultSet[name] = null;
					continue;
				}
				try {
					value = Ext.cruise.client.Utility.serializeXML(node);
				} catch (error) {
					_log.error("Invalid value of property {" + name +
						"} of component {" + this._instid + "#" + this._cid + "}" +
						error.stack);
				}
			}

			resultSet[name] = value;
		}

		return resultSet;
	};

	/**
	 * Generates the interface information including mediation specific data, i.e
	 * necessary transformations for properties and parameters.
	 *
	 * @function
	 * @private
	 * @param {Document} mcdl the component description as DOM
	 */
	var generateMediationConfig = function (smcd) {
		var t0 = +new Date();
		var wrapperconfig = {
			'properties': {},
			'events': {},
			'operations': {},
			'dragsources': {},
			'needsWrapper': false
		};
		var iface = smcd.querySelector("interface");
		/* iterate over all properties */
		var c_properties = iface.querySelectorAll('property');
		for (var idx = 0; idx < c_properties.length; ++idx) {
			var property = c_properties[idx];
			var propertyName = property.getAttribute('name');
			var split = property.getAttribute('type').split(':');
			var type = Ext.cruise.client.Utility.lookupNamespaceURI(split[0], property) + split[1];
			var parameters = [
				{
					'index_component': 0,
					'type': type,
					'type_component': type,
					'name': propertyName
				}
			];
			wrapperconfig.properties[propertyName] = {
				'name': propertyName,
				'parameters': parameters
			};
			//add for every property the mediation info for an event because of sync
			var eventName = propertyName + 'Changed';
			wrapperconfig.events[eventName] = {
				'name': eventName,
				'parameters': parameters
			};
		}
		/* handle dragsources */
		var d_source = iface.querySelectorAll('dragSource');
		for (var didx = 0, d_source_count = d_source.length; didx < d_source_count; ++didx) {
			var drag = d_source[didx];
			var dname = drag.getAttribute("name");
			var d_params = drag.querySelectorAll('parameter'), d_params_count = d_params.length;
			var parameters = [];
			for (var idx = 0; idx < d_params_count; ++idx) {
				var d_param = d_params[idx];
				/* expand the type's QName */
				var split = d_param.getAttribute('type').split(':');
				var type = Ext.cruise.client.Utility.lookupNamespaceURI(split[0], d_param) + split[1];
				/* store parameter infos */
				parameters[idx] = {
					'index_component': idx,
					'type': type,
					'type_component': type,
					'name': d_param.getAttribute('name')
				};

			}
			wrapperconfig.dragsources[dname] = {
				'name': dname,
				'parameters': parameters
			};
		}
		/* handle operations */
		var c_operations = iface.querySelectorAll('operation');
		for (var oidx = 0, c_operations_count = c_operations.length; oidx < c_operations_count; ++oidx) {
			var operation = c_operations[oidx];
			var oname = operation.getAttribute("name")
			var o_params = operation.querySelectorAll('parameter'), o_params_count = o_params.length;
			var parameters = [];
			for (var idx = 0; idx < o_params_count; ++idx) {
				var o_param = o_params[idx];
				var o_param_name = o_param.getAttribute('name');
				/* expand the type's QName */
				var split = o_param.getAttribute('type').split(':');
				var type = Ext.cruise.client.Utility.lookupNamespaceURI(split[0], o_param) + split[1];
				/* store parameter infos */
				parameters[idx] = {
					'index_component': idx,
					'type': type,
					'type_component': type,
					'name': o_param_name
				};
			}
			wrapperconfig.operations[oname] = {
				'name': oname,
				'parameters': parameters
			};
		}
		/* handle events */
		var c_events = iface.querySelectorAll('event');
		for (var eidx = 0, c_events_count = c_events.length; eidx < c_events_count; ++eidx) {
			var event = c_events[eidx];
			var ename = event.getAttribute("name");
			var e_params = event.querySelectorAll('parameter'), e_params_count = e_params.length;
			var parameters = [];
			for (var idx = 0; idx < e_params_count; ++idx) {
				var e_param = e_params[idx];
				var e_param_name = e_param.getAttribute("name");
				/* expand the type's QName */
				var split = e_param.getAttribute('type').split(':');
				var type = Ext.cruise.client.Utility.lookupNamespaceURI(split[0], e_param) + split[1];
				/* store parameter infos */
				parameters[idx] = {
					'index_component': idx,
					'type': type,
					'type_component': type,
					'name': e_param_name
				};
			}
			wrapperconfig.events[ename] = {
				'name': ename,
				'parameters': parameters
			};
		}
		_log.debug("... generating mediationConfig took", +new Date() - t0);
		return wrapperconfig;
	};

	/**
	 * Call this method to get a component instance from the given component
	 * decsriptor and its corresponding mediation informations. This method assumes
	 * that potential template code in SMCDL was expanded/replaced by the server-side
	 * runtime environment already.
	 *
	 * @scope {Documa.components.ComponentContainer}
	 * @param {DOMDocument} smcd component descriptor in SMCDL format with no
	 * template code within
	 * @param {Object} mediationInfo component specific mediation configuration
	 */
	var loadInstance = function (smcd, mediationInfo) {
		Documa.util.Util.checkScope(Documa.components.ComponentContainer, this);

		var constructorCode = getConstructorCode(smcd);
		var instance = this._container.contentWindow.eval(constructorCode);

		if (instance && mediationInfo.needsWrapper) {
			instance = new Ext.cruise.client.Wrapper(instance, mediationInfo);
		}

		return instance;
	};

	/**
	 * Collect all properties from current component instance and returns it as checkpoint object.
	 *
	 * @returns {Documa.components.ComponentCheckpoint} checkpoint
	 */
	function getCurrentCheckpoint() {
		if (!document.evaluate)
			throw new Error("Browser does not support xpath expressions!");

		// create empty checkpoint
		var checkpoint = new Documa.components.ComponentCheckpoint(this._instid, this._cid);

		// get all properties from component interface
		var d = this._descriptor.ownerDocument;
		var nodeList = d.querySelectorAll("component > interface > property");
		try {
			// add each property into checkpoint of current container
			for (var i = 0; i < nodeList.length; ++i) {
				var node = nodeList.item(i);
				var pname = node.getAttribute("name");
				var ptype = node.getAttribute("type");
				var value = this._instance.getProperty(pname);
				// *****************************************************
				// TODO: get further metadata from property element here
				// *****************************************************
				checkpoint.addProperty(pname, value, ptype);
			}
			return checkpoint;
		} catch (error) {
			_log.error(TAG, error.stack);
		}
	}

	/**
	 * Helper method checking if one of the request object has pending requests.
	 *
	 * @param {Function} callback
	 */
	function checkRequestObjects(callback) {
		var ready = true;
		for (var i = 0; i < this._serviceRequestObjects.length; ++i) {
			var reqObj = this._serviceRequestObjects[i];
			// checking of request object includes a pending request
			if (reqObj.getPendingRequestCount() > 0) {
				// found pending request object
				ready = false;
				var handler = reqObj.onreadystatechange;

				// wait until all pending requests were handled
				reqObj.onreadystatechange = function () {
					handler.apply(reqObj.getScope(), arguments);
					if (reqObj.readyState == 4) {
						// response completed --> check again if all request object are ready
						checkRequestObjects(callback);
					}
				};
			}
		}
		if (ready) {
			// no pending requests were detected
			callback();
		}
	}

	// *************************************************************************************
	// public members and methods **********************************************************
	// *************************************************************************************
	return {
		/**
		 * Constructor.
		 *
		 * @constructs
		 * @param {String} cid component id
		 * @param {String} instid component instance id
		 * @param {Array} resources list of required resources
		 */
		constructor: function (cid, instid, resources) {
			try {
				this._cid = cid;
				this._instid = instid;
				this._resources = resources;
				this._ready = false;
				this._applicationProxy = null;
				this._runtimeProxy = new Documa.components.RuntimeEventProxy(this);
				this._serviceAccessProxy = new Documa.components.ServiceAccessEventProxy(this);
				this._instance = null;
				this._isUI = false;
				this._descriptor = null;
				this._config = null;
				this._componentLoader = new Ext.cruise.client.SimpleWrapperUICLoader(_log);
				this._initialized = false;
				this._mediationConfig = null;
				this._ctxt = null;
				this._componentLoadingState = new Documa.components.ComponentLoadingState(cid, instid);
				this._inputEventBuffer = new Documa.components.ComponentEventBuffer();
				this._xhrWrapper = null;

				// includes all xml message request objects of component instance
				this._serviceRequestObjects = [];

				this._width = 0;
				this._height = 0;
				this._title = instid + "#" + cid;
				this._initializedCompletedCb = null;

				// keeps reference for interval checking pending request objects
				this._prepareInterval = null;

				/** id of initialization timer
				 * @type {Number} */
				this._initializationTimer = null;
				/** id of preparation timer
				 * @type {Number} */
				this._prepareTimer = null;

				// create container object in global DOM context
				this._container = document.createElement("iframe");
				this._container.setAttribute("id", "frame_" + instid);
				this._container.style.height = "100%";
				this._container.style.width = "100%";
				this._container.style.overflow = "auto";
				this._container.frameBorder = "0";
				//this._container.scrolling = "no";
				this._container.border = "none";
				//this._container.style.display = "none";

				// contains propertyChanged observer
				this._propertyObserver = [];

				/**
				 * Map maps property key to timer id.
				 * @type {{key:string}}
				 * @private
				 */
				this._propertyTimers = {};

				/** @type Ext.Panel */
				this._containerPanel = new Ext.Panel({
					contentEl: this._container,
					id: instid,
					//flex : 0,
					hidden: true,
					header: true,
					border: true,
					title: this._title,
					baseCls: "component-panel"
				});
				this._currentState = Documa.components.ComponentContainerStates.CONSTRUCTED;
				_log.debug(TAG, "... constructed.");
			} catch (error) {
				_log.error(TAG, error);
			}
		},
		/**
		 * Registers listener object including execute-scope and callback-function.
		 *
		 * @param {Object.<scope, handler>} observer
		 */
		addPropertyChangeListener: function (observer) {
			if (!(observer.scope && observer.handler))
				throw new Error("Invalid property observer registered!");

			this._propertyObserver.push(observer);
		},
		/**
		 * Removes observer with given scope and handler objects.
		 * @param {Object} scope handler's execution scope
		 * @param {Function} handler callback function
		 */
		removePropertyChangeListener: function (handler) {
			var delIndex = -1;
			for (var i = 0; i < this._propertyObserver.length; ++i) {
				/** @type {Object.<scope, handler>} */
				var observerEntry = this._propertyObserver[i];
				if (observerEntry.handler === handler) {
					delIndex = i;
					break;
				}
			}
			if (delIndex < 0) {
				_log.warn(TAG, "... could not remove property change listener!");
				return;
			}
			this._propertyObserver.splice(delIndex, 1);
			_log.debug(TAG, "... removed property change listener at index: " + delIndex);
		},
		/**
		 * Adds XML message request object to this container, after it was created by the corresponding component instance.
		 *
		 * @param {Documa.communication.XMLMessageRequest} requestObject
		 */
		addServiceRequestObject: function (requestObject) {
			_log.debug(TAG, "... adding service access request object to container {" + this._instid + "}");
			this._serviceRequestObjects.push(requestObject);
		},
		/**
		 * Returns array of xml message request objects.
		 *
		 * @returns {Array.<Documa.communication.XMLMessageRequest>}
		 */
		getServiceRequestObjects: function () {
			return this._serviceRequestObjects;
		},
		/**
		 * Call this method to start the component resource loading procedure.
		 * All resources are loaded according to their loading order
		 * subsequently. After all component resources were loaded successfully
		 * the given callback-function is executed.
		 *
		 * @param {String} componentID the id of the component
		 * @param {String} jobid id o integration job
		 * @param {Function}
		 *            callback function is called after all component resources
		 *            were loaded successfully
		 */
		loadResources: function (componentID, jobid, callback) {
			var self = this;

			// set container loaded callback
			this._container.onload = function () {

				var htmlTmplt = "<!DOCTYPE HTML>\n" + "<html>" + "<head>" + "<meta http-equiv=\"Content-type\" content=\"text/html;charset=UTF-8\">" + "</head>" + "<body></body></html>";

				// create doctype direction
				self._container.contentDocument.open();
				self._container.contentDocument.write(htmlTmplt);
				self._container.contentDocument.close();
				self._componentLoadingState.setProgress(0.0);

				var responseEventHistory = new Array();

				// helper to determine saved response event from history
				var getEventFromHistory = function (xhrInst) {
					for (var i = 0; i < responseEventHistory.length; ++i) {
						if (responseEventHistory[i].xhr === xhrInst) {
							return responseEventHistory[i].event;
						}
					}
					return null;
				};

				// **************************************************
				// DEFAULT API WRAPPER INJECTION for state extraction
				//self._xhrWrapper = Documa.communication.xhr.XHRFactory.createWrapper(self._container.contentWindow);
				self._xhrWrapper = self._serviceAccessProxy.createWrapper(self._container.contentWindow);
				self._xhrWrapper.onsend = function (data) {
					self._xhrRequestCounter++;
				};
				self._xhrWrapper.onresponse = function (xhrInstance) {
					_log.debug(TAG, "... xhr response received!");
					self._xhrRequestCounter--;
				};
				self._xhrWrapper.responsehandled = function (xhrInstance) {
				};
				// override xhr api with wrapping api
				self._container.contentWindow.XMLHttpRequest = self._xhrWrapper;

				// override setInterval api
				var setIntervalWrapper = self._runtimeProxy.createIntervalWrapper(self._container.contentWindow);
				var clearIntervalWrapper = self._runtimeProxy.createClearIntervalWrapper(self._container.contentWindow);
				self._container.contentWindow.setInterval = setIntervalWrapper;
				self._container.contentWindow.clearInterval = clearIntervalWrapper;
				self._container.contentWindow.setTimeout = self._runtimeProxy.createTimeoutWrapper(self._container.contentWindow);
				self._container.contentWindow.clearTimeout = self._runtimeProxy.createClearTimeoutWrapper(self._container.contentWindow);

				// TODO: add further API wrapper here
				// EOF WRAPPER INJECTION ****************************
				try {
					// *******************************************
					// integrate component resources into iframe *
					// *******************************************
					integrateResources.call(self._container.contentWindow, self, jobid, self._cid, self._container, 0, self._resources, callback);
				} catch (error) {
					_log.error(TAG, "Resource integration error of component: " + self._instid + "#" + self._cid + ": " + error.stack);
				}
			};
		},
		/**
		 * Method creates the component instance of this container and all
		 * required resources, e. g. the communication proxy or the component
		 * context.
		 *
		 * @param {String} jobid id of integration job
		 * @param {Object}
		 *            smcd component descriptor in SMCDL format
		 * @param {Object}
		 *            compConfig configuration of the component containing
		 *            default property values
		 * @param {Function}
		 *            callback callback function that should be executed after
		 *            the component was instantiated sucessfully
		 */
		instantiateComponent: function (smcd, compConfig, callback) {
			try {
				this._descriptor = smcd;
				if (!this._descriptor) {
					throw new Error("Invalid component descriptor argument during the instantiation given.");
				}

				this._config = compConfig;
				if (!this._config) {
					throw new Error("Invalid component configuration argument during the instantiation given.");
				}

				var instid = compConfig.id;
				if (!instid) {
					throw new Error("Could not determine instance id during component instantiation procedure.");
				}

				if (this._instid != instid) {
					throw new Error("Unexpected instance id in component container detected, during instantation process of {" + this._instid + "}");
				}

				// create mediation configuration data from given component descriptor
				this._mediationConfig = generateMediationConfig.call(this, smcd);

				var cid = smcd.getAttribute("id");
				this._isUI = (smcd.getAttribute("isUI").toLowerCase() === "true") ? true : false;

				if (this._cid !== cid)
					throw new Error("Wrong component descriptor used to instantiate component {" + this._cid + "}");
				_log.debug(TAG, "------------------------------------------------------------------");
				_log.debug(TAG, "... instantiating component {" + this._cid + "} with id {" + instid + "}");

				if (!this._container)
					throw new Error("Could not get runtime container of component {" + this._cid + "}");

				if (!this._container.contentWindow)
					throw new Error("Invalid runtime container to instantiate component {" + this._cid + "}");

				try {
					// here no expansion of template code is required because the server already has
					// done this for the client
					this._instance = loadInstance.call(this, smcd, this._mediationConfig);
					Documa.extendComponent(cid, this._instance);
					this._currentState = Documa.components.ComponentContainerStates.INSTANTIATED;
				} catch (e) {
					_log.error(TAG, "... error during the execution of components {" + this._cid + "} constructor: " + e);
					return;
				}

				_log.debug(TAG, "... instance of component {" + this._cid + "} created.");

				// create communication proxy
				this._applicationProxy = new Documa.components.ApplicationEventProxy(this);
				if (!this._applicationProxy) {
					throw new Error("Could not create component proxy in component container {" + this._cid + "}");
				}

				_log.debug(TAG, "... component proxy created");

				if (this._isUI) {
					// create rendertarget of the component instance
					var rtid = createRenderTarget.call(this, this._cid);
					if (!rtid) {
						throw new Error("Could not create render target element in component container {" + this._cid + "}");
					}
					_log.debug(TAG, "... rendertarget {" + rtid + "} created");

					// create component context
					this._ctxt = createComponentContext.call(this, this._applicationProxy, rtid);
				} else {
					// create component context
					this._ctxt = createComponentContext.call(this, this._applicationProxy, undefined);
				}

				if (!this._ctxt) {
					throw new Error("Could not create component context in component container {" + this._cid + "}");
				}
				_log.debug(TAG, "... component context created");
				_log.debug(TAG, "------------------------------------------------------------------");

				if (callback) {
					// execute callback
					callback(this);
				}
			} catch (error) {
				_log.error(TAG, " INSTANCE [" + this._instid + "]: " + error);
			}
		},
		/**
		 * This method should be executed after all inter-component channels were
		 * integrated, so that property changes during the component initialization could
		 * be propagate to other components or the runtime environment.
		 *
		 * @param {String} integrationType type of integration context
		 * @param {Function} callback function to handle components initialized event
		 */
		initializeComponent: function (integrationType, callback) {
			var uiman = Documa.RuntimeManager.getUIManager();
			var self = this;
			try {
				if (!callback) {
					throw new Error("No initialize completed callback defined!");
				}
				switch (integrationType) {
					case Documa.components.ComponentIntegrationTypes.INITIATION:
						_log.debug(TAG, "... integrate component {" + this._instid + "#" + this._cid + "} during application initiation phase!");
						this._initializedCompletedCb = callback;
						this._initializationTimer = setTimeout(function () {
							var errorMsg = "Waited for component initialization, but no completion event received from component: " + self._instid + "#" + self._cid;
							uiman.showError(errorMsg);
							throw new Error(errorMsg);
						}, INIT_TIMEOUT);
						this._instance.init(this._ctxt);
						break;
					case Documa.components.ComponentIntegrationTypes.MODIFICATION:
						_log.debug(TAG, "... integrate component {" + this._instid + "#" + this._cid + "} during distribution modification phase!");
						this._initializedCompletedCb = callback;
						this._initializationTimer = setTimeout(function () {
							var errorMsg = "Waited for component initialization, but no completion event received from component: " + self._instid + "#" + self._cid;
							uiman.showError(errorMsg);
							throw new Error(errorMsg);
						}, INIT_TIMEOUT);
						this._instance.init(this._ctxt);
						// block instance immediately
						//this._instance.disable();
						//this.block();
						break;
					case Documa.components.ComponentIntegrationTypes.EXTENSION:
						_log.debug(TAG, "... integrate component {" + this._instid + "#" + this._cid + "} during composition extension phase!");
						throw new Error("Not implemented yet!");
				}
			} catch (error) {
				this._initialized = false;
				_log.error(TAG, "... error during component initialization: " + error.stack);
				uiman.showError(error.toString());
			}
		},
		/**
		 * Releases all resources and destroys the component instance.
		 */
		destroy: function () {
			try {
				// remove meta-data elements
				_util.clearArray(this._serviceRequestObjects);
				delete this._serviceRequestObjects;
				delete this._componentLoadingState;
				delete this._mediationConfig;
				delete this._ctxt;
				delete this._descriptor;
				delete this._config;

				// release component instance
				this._instance.dispose();
				delete this._instance;

				// remove iframe
				delete this._containerPanel;
				delete this._container;
				this._inputEventBuffer.destroy();
				delete this._inputEventBuffer;

				// close proxy objects
				this._runtimeProxy.destroy();
				delete this._runtimeProxy;
				this._applicationProxy.destroy();
				delete this._applicationProxy;
				this._serviceAccessProxy.destroy();
				delete this._serviceAccessProxy;

				// - close wrapper objects
				delete this._xhrWrapper;
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 * Called during the component initialization phase. For each property its default value
		 * from the composition model or SCMD component descriptor will be set.
		 *
		 * @param {Function} callback handler to be called after all properties were initialized
		 */
		setProperties: function (callback) {
			try {
				// getting default property values
				var defProps = getDefaultProperties.call(this, this._descriptor);

				// set default configuration
				setProperties.call(this, this._config, defProps);

				// change flag to represent the initialization state of the component
				this._initialized = true;
				this._currentState = Documa.components.ComponentContainerStates.INITIALIZED;
				if (callback) {
					callback(this);
				}
			} catch (error) {
				this._initialized = false;
				_log.error(TAG, "... error during property setting: " + error.stack);
			}
		},
		/**
		 * Render component instance.
		 */
		show: function () {
			try {
				//this._container.style.display = "block";
				this._instance.show();
				this._containerPanel.doLayout();
				this._containerPanel.show();
				this.setSize(this._width, this._height);
			} catch (error) {
				_log.error(TAG, " INSTANCE [" + this._instid + "]: " + error);
			}
		},
		/**
		 * Frees this container from current blocking state.
		 */
		unblock: function () {
			try {
				_log.debug(TAG, "... unblocking component event proxies!");
				hideBlockPanel.call(this);
				this._applicationProxy.unblock();
				this._serviceAccessProxy.unblock();
				this._runtimeProxy.unblock();
				// unblock associated xmr objects
				for (var i = 0; i < this._serviceRequestObjects.length; ++i) {
					/** @type Documa.communication.XMLMessageRequest */
					var xmr = this._serviceRequestObjects[i];
					if (!(xmr instanceof Documa.communication.XMLMessageRequest))
						throw new Error("Invalid type of message request object detected!");

					xmr.unblock();
				}
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 * Blocks current component instance from incoming events.
		 */
		block: function () {
			try {
				// show block panel
				showBlockPanel.call(this);
				this._currentState = Documa.components.ComponentContainerStates.BLOCKED;

				_log.debug(TAG, "... blocking input event proxies!");
				// decouple components --> block each input event proxy
				// block incoming call event from event broker
				this._applicationProxy.block();
				this._serviceAccessProxy.block();
				this._runtimeProxy.block();
				// ****************************************************************************
				// TODO: here block other input event proxy objects of this component container
				// ****************************************************************************

				// block all the XMR which are associated with the container's current instance
				// get all associated xmrs of the service access
				for (var i = 0; i < this._serviceRequestObjects.length; ++i) {
					/** @type Documa.communication.XMLMessageRequest */
					var xmr = this._serviceRequestObjects[i];
					if (!(xmr instanceof Documa.communication.XMLMessageRequest))
						throw new Error("Invalid type of message request object detected!");

					xmr.block();
				}
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 * Prepares migration process, i. e. blocking component instance and several proxy elements,
		 * and registers specified callback functions for ready, cancellation or error state.
		 *
		 * @param {Function} successCb callback to handle ready state
		 * @param {Function} errorCb callback to handle error state
		 */
		prepareMigration: function (successCb, errorCb) {
			var prepareStart = +new Date();
			// block current component container
			this.block();

			// get start time of prepare phase
			var self = this;
			// register callbacks as prepare entry
			this._prepareEntry = {
				success: successCb,
				failure: errorCb
			};

			// starting timer for waiting on prepare result
			this._prepareTimer = setTimeout(function () {
				// prepare timer expired
				// start to cancel migration
				self.unblock();
				errorCb.call(self, new Error("Prepare timer expired!"));
			}, PREPARE_TIMEOUT);

			// function excuted after the target runtime signalizes ready
			var startPrepare = function () {
				if (!Ext.isFunction(this._instance.prepare)) {
					throw new Error("Missing generic prepare-function of component {" + this._cid + "}");
				}
				_log.debug(TAG, "... preparing component instance {" + self._instid + "}");
				// call disable function of component
				// if component is ready it will signal
				// state with a corresponding event (see function 'handleComponentEvent')
				this._instance.prepare();
			};

			// check state of current XMR objects --> after all requests of this container are finished
			// continue with further preparation checks
			checkRequestObjects.call(self, function () {
				// all XMR request are handled --> no pending request object alive

				if (self._xhrRequestCounter > 0) {
					// browsers native request object has pending requests --> poll until all pending requests were completed
					var iv = setInterval(function () {
						if (self._xhrRequestCounter == 0) {
							// all pending xhr requests were handled
							clearInterval(iv);
							_log.debug(TAG, "... no pending requests at native browser xhr object");
							try {
								startPrepare.call(self);
							} catch (error) {
								self.unblock();
								_log.error(TAG, error.stack);
								errorCb.call(self, error);
							}
						}
					}, 300);
				} else {
					_log.debug(TAG, "... no pending requests at native browser xhr object");
					try {
						// no pending requests --> call prepare method of component
						startPrepare.call(self);
					} catch (error) {
						self.unblock();
						_log.error(TAG, error.stack);
						errorCb.call(self, error);
					}
				}
			});
		},
		/**
		 * Rollback migration preparation steps.
		 *
		 * @param {Function} successCb handler called on successful cancellation
		 * @param {Function} errorCb handler called on error prone cancellation
		 */
		cancelMigration: function (successCb, errorCb) {
			if (this._currentState !== Documa.components.ComponentContainerStates.BLOCKED) {
				// component was not blocked --> cancellation steps not required
				_log.error(TAG, "... tried to cancel migration of an unblocked component!");
				errorCb(this, new Error("Component is not blocked!"));
				return;
			}
			try {
				if (!Ext.isFunction(this._instance.unprepare))
					throw new Error("Missing generic unprepare-function of component {" + this._cid + "}");

				_log.debug(TAG, "... cancelling prepare state of component {" + this._instid + "#" + this._cid + "}");

				// unblock the component instance
				this._instance.unprepare();

				// unblock current component
				this.unblock();

				// get activity events from eventbuffer --> events active at blocking time
				var activityEvents = this._inputEventBuffer.getActivityEventBuffer();
				for (var id in activityEvents) {
					var inputEvent = activityEvents[id];
					// inject activity event into previously blocked component
					if (inputEvent instanceof Documa.components.ComponentCallEvent) {
						_log.debug(TAG, "... injecting call event.");
						container.getApplicationEventProxy().injectEvent(inputEvent);
					} else if (inputEvent instanceof Documa.components.ServiceResponseEvent) {
						_log.debug(TAG, "... injecting service response event.");
						container.getServiceEventProxy().injectEvent(inputEvent);
					} else if (inputEvent instanceof Documa.components.IntervalInputEvent) {
						_log.debug(TAG, "... injecting interval event.");
						container.getRuntimeEventProxy().injectEvent(inputEvent);
					} else if (inputEvent instanceof Documa.components.TimeoutInputEvent) {
						_log.debug(TAG, "... injecting timer event.");
						container.getRuntimeEventProxy().injectEvent(inputEvent);
					} else if (inputEvent instanceof Documa.components.StartIntervalEvent) {
						container.getRuntimeEventProxy().injectEvent(inputEvent);
					} else {
						throw new Error("Input event currently not supported yet!");
					}
				}
				this._currentState = Documa.components.ComponentContainerStates.ACTIVE;
				successCb(this);
			} catch (error) {
				_log.error(error.stack);
				errorCb(this, error);
			}
		},
		/**
		 * Called when the component is firing an property changed event on application layer.
		 *
		 * @param {string} propertyName
		 * @param {string} newValue
		 */
		onComponentPropertyChanged: function (propertyName, newValue) {
			_log.debug(TAG, "... component property changed: " + propertyName + " to value: " + newValue);
			try {
				for (var i = 0; i < this._propertyObserver.length; ++i) {
					/** @type {Object.<scope, handler>} */
					var observer = this._propertyObserver[i];
					// remove expiration timer from registry
					var timerId = this._propertyTimers[propertyName];
					if (timerId !== undefined && timerId >= 0)
						clearTimeout(timerId);
					if (observer.handler && observer.scope) // notifying observer
						observer.handler.call(observer.scope, propertyName, newValue);
				}
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 * Called when the component is firing lifecycle events, e. g. an event to signal its ready state after it was disabled.
		 *
		 * @param {Ext.cruise.client.Message} lifecycleEvent component's lifecycle event
		 */
		onComponentLifecycleEvent: function (lifecycleEvent) {
			try {
				switch (lifecycleEvent.getName()) {
					case Documa.components.ComponentLifecycleEvents.INITIALIZED:
						_log.debug(TAG, "... received initialized event from component: " + this._instid + "#" + this._cid);
						if (!this._initializedCompletedCb) {
							throw new Error("No initialized completed event handler defined!");
						}
						// receiving component init completed --> clear init waiting timer
						clearTimeout(this._initializationTimer);

						// callback initialized event handler
						this._initializedCompletedCb(this);
						break;
					case Documa.components.ComponentLifecycleEvents.BLOCKED:
						_log.debug(TAG, "... received component lifecycle event: BLOCKED");
						_log.debug(TAG, "... components ready state: " + lifecycleEvent.getBody()["ready"]);

						// received component blocked event message
						if (this._currentState === Documa.components.ComponentContainerStates.BLOCKED) {
							// remove preparation timer
							clearTimeout(this._prepareTimer);

							// start check pointing
							var checkpoint = getCurrentCheckpoint.call(this);

							// get events from event buffer --> current assumption: event buffer contains
							// only not handled events collected during the prepare phase
							var openEvents = new Array();

							// get event buffer of non-terminated component activities
							var eventBuffer = this._inputEventBuffer.getActivityEventBuffer();
							for (var ts in eventBuffer) {
								openEvents.push(eventBuffer[ts]);
							}

							// call success-function registered during the prepare phase
							this._prepareEntry.success(lifecycleEvent.getBody()["ready"], checkpoint, openEvents);
						} else {
							this._prepareEntry.failure(new Error("Received blocked event from component, but its container is not blocked!"));
						}
						break;
					case Documa.components.ComponentLifecycleEvents.PROCESSED:
						// get matching component input event and remove it from event buffer
						var id = lifecycleEvent.getBody()["id"];

						// remove event with given id from event buffer
						var inputEvent = this._inputEventBuffer.getInputEvent(id);
						if (!inputEvent) {
							_log.warn(TAG, "... could not get input event");
							return;
						}

						this._inputEventBuffer.remove(inputEvent);
						break;
					// TODO: add further life cycle events here
				}
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 * Returns containers component id.
		 *
		 * @return {String}
		 */
		getComponentID: function () {
			return this._cid;
		},
		/**
		 * Returns containers component instance id.
		 *
		 * @return {String}
		 */
		getComponentInstanceID: function () {
			return this._instid;
		},
		/**
		 * Returns component instance.
		 *
		 * @return {Object}
		 */
		getComponentInstance: function () {
			return this._instance;
		},
		/**
		 * Returns components communication proxy.
		 *
		 * @returns {Documa.components.ApplicationEventProxy}
		 */
		getApplicationEventProxy: function () {
			return this._applicationProxy;
		},
		/**
		 * Returns component's runtime event proxy.
		 *
		 * @returns {Documa.components.RuntimeEventProxy}
		 */
		getRuntimeEventProxy: function () {
			return this._runtimeProxy;
		},

		/**
		 * Returns component's service response event proxy.
		 *
		 * @returns {Documa.components.ServiceAccessEventProxy}
		 */
		getServiceEventProxy: function () {
			return this._serviceAccessProxy;
		},

		/**
		 * Returns components's event buffer containing all incoming events from different runtime parts, e. g. the eventbroker or service access.
		 *
		 * @returns {Documa.components.ComponentEventBuffer}
		 */
		getInputEventBuffer: function () {
			return this._inputEventBuffer;
		},
		/**
		 * Returns flag that indicates the loading state of all component resources.
		 *
		 * @returns {Boolean} true, if all component resources were loaded successfully,
		 * else false
		 */
		isReady: function () {
			return this._ready;
		},
		/**
		 * Returns flag indicating if the container encompasses a UI component or not.
		 *
		 * @return {Boolean} true if the container encompasses a UI component, else false
		 */
		isUI: function () {
			return this._isUI;
		},
		/**
		 * Returns the initialization state of the encapsulated component.
		 */
		isInitialized: function () {
			return this._initialized;
		},
		/**
		 * Returns all configurations extracted from the SMCDL component descriptor that
		 * are relevant for the mediation process.
		 */
		getMediationConfiguration: function () {
			return this._mediationConfig;
		},
		/**
		 * Returns the iframe element in which context the component instance is
		 * executed.
		 *
		 * @return {DOMIFrame}
		 */
		getContainerElement: function () {
			return this._container;
		},
		/**
		 * Returns message object created in the execution context of the component
		 * instance.
		 */
		createMessage: function (message) {
			if (Documa.util.Util.validateMessage(message)) {
				let msgCopy = new this._container.contentWindow.Documa.components.ComponentMessage();
				msgCopy.setName(message.getName());
				msgCopy.setBody(message.getBody());
				msgCopy.setCallbackId(message.getCallbackId());
				msgCopy.setDescription(message.getDescription());
				msgCopy.setDatatype(message.getDatatype());
				msgCopy.setSyncThreshold(message.getSyncThreshold());
				return msgCopy;
			}
			throw new Error("InvalidComponentMessageError");
		},
		/**
		 * Invokes the specified operation in the context of the related component
		 * instance. This method is used during the transition
		 * into the initial application state.
		 *
		 * @param {Documa.communication.protocol.Operation} operation operation object
		 * that encapsulates protocol details
		 */
		invokeOperation: function (operation) {
			if (!operation instanceof Documa.communication.protocol.Operation) {
				throw new Error("Invalid operation object specified.");
			}

			var targetParams = this._mediationConfig.operations[operation.getName()].parameters;
			for (var i = 0; i < targetParams.length; ++i) {
				var cur_param = targetParams[i];
				if (cur_param.type === cur_param.type_component) {
					continue;
				}
				// TODO: implement mediation logic here
			}

			try {
				// create message object in the namespace context of this container
				var msg = new this._container.contentWindow.Ext.cruise.client.Message();
				msg.setBody(operation.getParameters());
				this._instance.invokeOperation(operation.getName(), msg);
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 * Wrapping function that encapsulates the invocation details of a component operation.
		 *
		 * @param {String} operationName operation's name
		 * @param {Documa.components.ComponentMessage} message published component message published by the event broker
		 * @param {String} callid id of component call event
		 */
		invokeOperationWithMessage: function (operationName, message, callid) {
			try {
				// ********************************************************
				// TODO: let the runtime event proxy ignore the activation
				// of interval events during the replay of call events
				// ********************************************************
				_log.debug(TAG, "... calling operation: " + operationName);
				var msgCopy = null;
				// create a message instance of the container context
				if (Documa.util.Util.validateMessage(message)) {
					msgCopy = new this._container.contentWindow.Documa.components.ComponentMessage();
					msgCopy.setName(message.getName());
					msgCopy.setBody(message.getBody());
					msgCopy.setCallbackId(message.getCallbackId());
					msgCopy.setDescription(message.getDescription());
					msgCopy.setDatatype(message.getDatatype());
					msgCopy.setSyncThreshold(message.getSyncThreshold());
					msgCopy.setStatus(message.getStatus());

					// *** important for migratable components ****
					// append id of call event into the call message
					// call id required, because the component has to decide
					// when the event is processed completely
					msgCopy.getCallEventId = function () {
						return callid;
					};
				} else {
					throw new Error("Invalid component message!");
				}
				if (!Ext.isFunction(this._instance.invokeOperation))
					throw new Error("Missing obligatory component function 'invokeOperation'!");

				this._instance.invokeOperation(operationName, msgCopy);
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 * Sets given property value to current component instance.
		 *
		 * @param {String} key access key of property
		 * @param {string} value property value
		 * @param {String} eventid id of call event
		 */
		setProperty: function (key, value, eventid) {
			try {
				_log.debug(TAG, "... setting property: " + key + " to value: " + value);
				this._instance.callEventId = eventid;
				let self = this;
				// create change event timer
				this._propertyTimers[key] = setTimeout(function () {
					// let errorMsg = "Property changed timer expired for property {" + key + "} of component {" + self._instid + "#" + self._cid + "}!";
					// _log.error(TAG, errorMsg);
					// Documa.RuntimeManager.getUIManager().showError(errorMsg);
				}, 10000);
				this.addPropertyChangeListener({
					scope: this,
					handler: (name, value) => { /* nothing to do here*/
					}
				});
				let oldValue = this._instance.getProperty(key);
				if (value !== oldValue) // update only if value is different
					this._instance.setProperty(key, value);
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 * Sets size of container elements on presentation layer.
		 *
		 * @param {Number} width
		 * @param {Number} height
		 */
		setSize: function (width, height) {
			_log.debug(TAG, "... setting size of UI component: " + this._instid + "#" + this._cid + " to {w: " + width + ", h: " + height + "}");
			var lm = Documa.RuntimeManager.getUIManager().getLayoutManager();
			var paddingValue = lm.getComponentPadding();
			var marginValue = lm.getComponentMargin();
			var borderValue = lm.getComponentBorderSize();
			var headerPadding = lm.getComponentHeaderPadding();
			var headerMargin = lm.getComponentHeaderMargin();
			var scrollbarSize = lm.getScrollbarSize();

			// Der gegebene Margin-Rand muss innerhalb der Komponentenbreite und -größe enthalten sein.

			var containerHeaderHeight = this._containerPanel.header.getHeight();
			var containerWidth = width - 2 * (marginValue + borderValue);
			var containerHeight = height - (2 * marginValue + borderValue) - headerMargin;

			var componentWidth = containerWidth - 2 * (paddingValue + marginValue);
			var componentHeight = containerHeight - 2 * (paddingValue + marginValue) - containerHeaderHeight;

			// set size of container panel, iframe and instance
			this._containerPanel.setSize(containerWidth, containerHeight);
			this._instance.setProperty("width", componentWidth);
			this._instance.setProperty("height", componentHeight);
			this._containerPanel.doLayout();

			this._width = width;
			this._height = height;
		},
		/**
		 * Returns property value.
		 * @returns {String}
		 */
		getProperty: function (key) {
			try {
				return this._instance.getProperty(key);
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 *
		 * @param {Documa.ui.layout.LayoutElement} layoutObj
		 */
		layout: function (layoutElem) {
			if (!layoutElem instanceof Documa.ui.layout.LayoutElement)
				throw new Error("Invalid layout element defined!");

			if (layoutElem instanceof Documa.ui.layout.Position) {
				// TODO: set layoutElement information to the container element here
			} else {
				throw new Error("Found not supported layout element!");
			}
		},
		/**
		 * Returns containers panel.
		 *
		 * @return {Ext.Panel}
		 */
		getContainerPanel: function () {
			return this._containerPanel;
		},
		/**
		 * Returns component's loading state object.
		 *
		 * @return {Documa.components.ComponentLoadingState}
		 */
		getLoadingState: function () {
			return this._componentLoadingState;
		},
		/**
		 * Returns component descriptor in SMCDL format as DOM document.
		 *
		 * @return {Document} component descriptor in SMCDL format
		 */
		getDescriptor: function () {
			return this._descriptor;
		},

		/**
		 * Returns component container's life cycle state.
		 * @return {Documa.components.ComponentContainerStates} possible values of enumeration Documa.components.ComponentContainerStates
		 */
		getCurrentState: function () {
			return this._currentState;
		},

		/**
		 * Sets current state of component container. Possible values are declared in enumeration Documa.components.ComponentContainerStates
		 *
		 * @param {Documa.components.ComponentContainerStates} state new state
		 */
		setCurrentState: function (state) {
			this._currentState = state;
		}
	};
})());
