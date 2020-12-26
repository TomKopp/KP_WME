Ext.namespace("Documa.components");

Documa.require("Documa.util.Logger");
Documa.require("Documa.components.ComponentEventProxy");
Documa.require("Documa.components.StartIntervalEvent");
Documa.require("Documa.components.IntervalInputEvent");
Documa.require("Documa.components.TimeoutInputEvent");

/**
 * @class
 * @extends {Documa.components.ComponentEventProxy}
 */
Documa.components.RuntimeEventProxy = Ext.extend(Documa.components.ComponentEventProxy, (function () {
	const TAG = "Documa.components.RuntimeEventProxy";
	const INTERVAL_PREFIX = "iv";
	const TIMEOUT_PREFIX = "to";
	const LOG = Documa.util.Logger;

	/**
	 * Creates setInterval-wrapper generator method.
	 * @param {window} global
	 * @returns {Function}
	 */
	function createSetIntervalWrapper(global) {
		let wrapped = global.setInterval;
		let self = this;

		// returning wrapper function

		/**
		 * @param {Function | String} func
		 * @param {Number} interval
		 */
		return function (func, interval) {
			// ********************************************
			// code executed only once during the component
			// integration process
			LOG.debug(TAG, "... created interval wrapper!");
			if (!interval)
				interval = 0;
			// getting handler function parameters at index 2
			let pargs = Array.prototype.slice.call(arguments, 2);
			let count = 0;
			let id = window.uuid.v1();
			// creating object that describes handler context of next input event
			let handlerContext = null;
			// ****************************************************************************
			// decide here if current context is during runtime or during state injection *
			// ****************************************************************************
			// *******************************************
			let iv = wrapped(function () {
				// ***************************************
				// executed continuously
				let args = [];
				// create interval input event representing the start of an asynchronous event
				// the component will signalize the completion of the loop by sending back a PROCESSED event
				let intervalEvent = new Documa.components.IntervalInputEvent(handlerContext, iv, interval, count, pargs, id);
				// interval events are blocked
				if (self._blocked) {
					global.clearInterval(iv);
					// current container's state will be recovered --> ignore following interval event registration
					LOG.debug(TAG, "... prevent duplicated interval event.");
					self._container.getInputEventBuffer().addDownstreamEvent(intervalEvent);
					return 0;
				} else {
					// add last interval event into event buffer
					self._container.getInputEventBuffer().addActivityEvent(intervalEvent);
					// add interval input event as FIRST argument
					args.push(intervalEvent.getId());
					pargs.forEach(function (element) {
						args.push(element);
					});

					if (typeof func === "function") {
						// execute interval event handler
						func.apply(self._container.getComponentInstance(), args);
					} else if (typeof func === "string") {
						// evaluate code string
						let code = "let eventid=" + intervalEvent.getId() + "; " + func;
						eval.call(window, code);
					} else {
						// just do nothing
					}
					count++;
					// add last interval event into event buffer
					self._container.getInputEventBuffer().remove(intervalEvent);
				}
				// ****************************************
			}, interval);

			handlerContext = new Documa.components.ComponentHandlerContext("", pargs[0], pargs.slice(1));
			let startIntervalEvent = new Documa.components.StartIntervalEvent(handlerContext, iv, interval);
			let params = [];

			// append event id as first parameter into handler context
			params.push(startIntervalEvent.getId());

			if (handlerContext.getContextID()) {
				// register current interval handler function
				self._handlerRegistry[handlerContext.getContextID()] = {
					handler: func,
					scope: this,
					args: params.concat(pargs)
				};
			}

			self._intervalCounter++;
			if (self._blocked) {
				self._container.getInputEventBuffer().addDownstreamEvent(startIntervalEvent);
				global.clearInterval(iv);
				return null;
			} else {
				self._container.getInputEventBuffer().addActivityEvent(startIntervalEvent);
			}
			return iv;
		};
	}

	/**
	 * Create wrapper of clearInterval function.
	 *
	 * @param {window} global
	 * @returns {Function}
	 */
	function createClearIntervalWrapper(global) {
		let wrapped = global.clearInterval;
		let self = this;
		return function (intervalId) {
			LOG.debug(TAG, "... clearing interval: " + intervalId);

			// removing start interval event from corresponding buffer
			let activityEventBuffer = self._container.getInputEventBuffer().getActivityEventBuffer();
			for (let eventId in activityEventBuffer) {
				if (!(activityEventBuffer[eventId] instanceof Documa.components.StartIntervalEvent))
					continue;

				/** @type {Documa.components.StartIntervalEvent} */
				let inputEvent = activityEventBuffer[eventId];
				if (inputEvent.getIntervalId() === intervalId) {
					self._container.getInputEventBuffer().remove(inputEvent);
				}
			}

			wrapped(intervalId);
		};
	}

	/**
	 * Creates setTimeout-wrapper generator method.
	 *
	 * @param {window} global
	 * @returns {Function}
	 */
	function createSetTimeoutWrapper(global) {
		let wrapped = global.setTimeout;
		let self = this;
		return function (func, delay) {
			// getting list of parameters
			let params = Array.prototype.slice.call(arguments, 2);
			if (!delay)
				delay = 0;
			// creating handler id
			let id = window.uuid.v1();
			/*handlerName, arguments, scope, handler*/
			let handlerContext = new Documa.components.ComponentHandlerContext("", TIMEOUT_PREFIX + self._timerCounter, params);
			// register current interval handler function
			self._handlerRegistry[handlerContext.getContextID()] = {
				handler: func,
				scope: this
			};
			let timeoutId = null;
			if (typeof func === 'function') {
				// creating wrapper function that is called after the delay is over
				timeoutId = wrapped(function () {
					let timeoutEvent = new Documa.components.TimeoutInputEvent(handlerContext, timeoutId, delay, params, id);
					// executed after delay is over
					if (self._blocked) {
						self._container.getInputEventBuffer().addDownstreamEvent(timeoutEvent);
						return;
					} else {
						self._container.getInputEventBuffer().addActivityEvent(timeoutEvent);
					}

					// create argument arry
					let args = [];

					// set event id as FIRST parameter
					args.push(timeoutEvent.getId());

					// delay is over --> call handler
					func.apply(this, args.concat(params));

					// remove event from activity log, because it was handled
					self._container.getInputEventBuffer().remove(timeoutEvent);
				}, delay);
			} else if (typeof func === 'string') {
				timeoutId = wrapped(function () {
					let timeoutEvent = new Documa.components.TimeoutInputEvent(handlerContext, timeoutId, delay, params, id);
					// executed after delay is over
					if (self._blocked) {
						self._container.getInputEventBuffer().addDownstreamEvent(timeoutEvent);
						return;
					} else {
						self._container.getInputEventBuffer().addActivityEvent(timeoutEvent);
					}

					let code = "let eventid = " + timeoutEvent.getId() + "; " + func;
					eval.call(window, code);

					// remove event from activity log, because it was handled
					self._container.getInputEventBuffer().remove(timeoutEvent);
				}, delay);
			} else {
				throw new Error("Invalid function argument!");
			}
			// creating an handler context id
			self._timerCounter++;
			return timeoutId;
		};
	}

	function createClearTimeoutWrapper(global) {
		let wrapped = global.clearTimeout;
		return function (timeoutid) {
			LOG.debug(TAG, "... clearing timeout: " + timeoutid);
			wrapped(timeoutid);
		};
	}

	return {
		/**
		 * Constructor.
		 * @param {Documa.components.ComponentContainer} container
		 */
		constructor: function (container) {
			Documa.components.RuntimeEventProxy.superclass.constructor.call(this);
			this._container = container;
			this._intervalCounter = 0;
			this._timerCounter = 0;
			this._handlerRegistry = {};
		},
		destroy: function () {
			delete this._container;
			delete this._handlerRegistry;
		},
		createIntervalWrapper: function (global) {
			return createSetIntervalWrapper.call(this, global);
		},
		createClearIntervalWrapper: function (global) {
			return createClearIntervalWrapper.call(this, global);
		},
		createTimeoutWrapper: function (global) {
			return createSetTimeoutWrapper.call(this, global);
		},
		createClearTimeoutWrapper: function (global) {
			return createClearTimeoutWrapper.call(this, global);
		},

		/**
		 * Called during state injection phase. It forwards activity event to component instance despite
		 * the blockade during the migration prepare phase at receiver-side.
		 *
		 * @param {(Documa.components.IntervalInputEvent) |
		 * 		(Documa.components.TimeoutInputEvent) |
		 * 		(Documa.components.StartIntervalEvent) } inputEvent
		 */
		injectEvent: function (inputEvent) {
			if (!this._blocked) {
				throw new Error("Call event proxy is not in expected blocking state!");
			}
			// open blocked
			this._blocked = false;
			if (inputEvent instanceof Documa.components.IntervalInputEvent) {
				// get handler context from event
				let contextId = inputEvent.getHandlerContext().getContextID();

				/** @type {Object.<handler, scope, args>}*/
				let handlerObj = this._handlerRegistry[contextId];
				if (typeof handlerObj.handler === 'function') {
					handlerObj.handler.apply(handlerObj.scope, handlerObj.args);
				} else if (typeof handlerObj.handler === 'string') {
					eval.call(window, handlerObj.handler);
				} else {
					throw new Error("Unsupported handler type detected!");
				}
			} else if (inputEvent instanceof Documa.components.TimeoutInputEvent) {
				// get handler context from event
				let contextId = inputEvent.getHandlerContext().getContextID();

				/** @type {Object.<handler, scope, args>}*/
				let handlerObj = this._handlerRegistry[contextId];

				if (typeof handlerObj.handler === 'function') {
					handlerObj.handler.apply(handlerObj.scope, handlerObj.args);
				} else if (typeof handlerObj.handler === 'string') {
					eval.call(window, handlerObj.handler);
				} else {
					throw new Error("Unsupported handler type detected!");
				}
			} else if (inputEvent instanceof Documa.components.StartIntervalEvent) {
				let contextId = inputEvent.getHandlerContext().getContextID();

				// append all arguments into an array in correct order to
				// reproduce the activation of an start interval event
				let args = [this._container.getComponentInstance().onAsyncEvent, inputEvent.getDelay(), contextId].concat(inputEvent.getHandlerContext().getArguments());

				// activate interval with all arguments determined from event's handler context
				this._container.getContainerElement().contentWindow.setInterval.apply(this._container.getComponentInstance(), args);
			} else {
				throw new Error("Invalid argument!");
			}
			// close blockade
			this._blocked = true;
		},

		/**
		 *
		 * @param {(Documa.components.IntervalInputEvent) | (Documa.components.TimeoutInputEvent) | (Documa.components.StartIntervalEvent)} downstreamEvent
		 */
		injectDownstreamEvent: function (downstreamEvent) {
			if (this._blocked) {
				throw new Error("Unexpected blocking state!");
			}
			if (downstreamEvent instanceof Documa.components.IntervalInputEvent) {
				// get handler context from event
				let contextId = downstreamEvent.getHandlerContext().getContextID();
				/** @type {Object.<handler, scope, args>}*/
				let handlerObj = this._handlerRegistry[contextId];
				if (typeof handlerObj.handler === 'function') {
					handlerObj.handler.apply(handlerObj.scope, handlerObj.args);
				} else if (typeof handlerObj.handler === 'string') {
					eval.call(window, handlerObj.handler);
				} else {
					throw new Error("Unsupported handler type detected!");
				}
			} else if (downstreamEvent instanceof  Documa.components.TimeoutInputEvent) {
				// get handler context from event
				let contextId = downstreamEvent.getHandlerContext().getContextID();

				/** @type {Object.<handler, scope, args>}*/
				let handlerObj = this._handlerRegistry[contextId];

				if (typeof handlerObj.handler === 'function') {
					handlerObj.handler.apply(handlerObj.scope, handlerObj.args);
				} else if (typeof handlerObj.handler === 'string') {
					eval.call(window, handlerObj.handler);
				} else {
					throw new Error("Unsupported handler type detected!");
				}
			} else if (downstreamEvent instanceof Documa.components.StartIntervalEvent) {
				let contextId = downstreamEvent.getHandlerContext().getContextID();

				/** @type {Object.<handler, scope, args>}*/
				let handlerObj = this._handlerRegistry[contextId];

				this._container.getContainerElement().contentWindow.setInterval(handlerObj.handler, downstreamEvent.getDelay());
			} else {
				throw new Error("Invalid argument!");
			}
		},

		/**
		 * Returns registry of function handler.
		 *
		 * @returns {Object} map containing several interval handler
		 */
		getHandlerRegistry: function () {
			this._handlerRegistry;
		}

	};
})());
