Ext.namespace('Documa.communication.events');

Documa.require('Documa.communication.events.Event');
Documa.require('Documa.communication.events.SystemEvent');
Documa.require('Documa.communication.events.ApplicationEvent');
Documa.require('Documa.communication.events.ApplicationLifecycleChangedEvent');
Documa.require('Documa.communication.events.ApplicationErrorEvent');
Documa.require('Documa.communication.events.ContextEvent');

/**
 * @class
 */
Documa.communication.events.EventFactory = Ext.extend(Object, (function () {
    return {
        constructor: function () {
            Documa.communication.events.EventFactory.superclass.constructor.call(this);
        },
        /**
         * Creates the event object from the given parameters.
         * @param {Integer} level application or system level messages
         * @param {String} msgtag event identificator
         * @param {Object} payload event paylaod
         * @returns {Documa.communication.events.Event}
         */
        create: function (level, msgtag, payload) {
            let ev = null;
            switch (level) {
                case Documa.communication.MessageFieldValues.APP_LEVEL:
                    // create an application event
                    ev = new Documa.communication.events.ApplicationEvent();
                    break;
                case Documa.communication.MessageFieldValues.SYS_LEVEL:
                    // create an system event
                    ev = new Documa.communication.events.SystemEvent();
                    break;
            }

            ev.setMessageTag(msgtag);
            ev.setPayload(payload);
            ev.setTimestamp(new Date().getTime());
            return ev;
        },
        /**
         * Returns matching event instance from given message object.
         *
         * @param {Documa.communication.Message} message generic message object
         * @returns {Documa.communication.events.Event}
         */
        createEvent: function (message) {
            let evt = null;
            if (!message instanceof Documa.communication.Message)
                throw new Error("Could not create event because of invalid arguments");
            // analyze message semantic
            switch (message.getMessageTag()) {
                /////////////////////////////////////
                // System level server-side events //
                /////////////////////////////////////
                case Documa.communication.events.SystemEvents.USABLE_DEVSRMVED:
                case Documa.communication.events.SystemEvents.USABLE_DEVSADDED:
                case Documa.communication.events.SystemEvents.ONREQUSTSERV:
                case Documa.communication.events.SystemEvents.DESCR_READY:
                    evt = new Documa.communication.events.SystemEvent(message);
                    break;
                //////////////////////////////////////////
                // Application level server-side events //
                //////////////////////////////////////////
                case Documa.communication.events.ApplicationEvents.APP_LIFECYCLE_CHANGED:
	                evt = new Documa.communication.events.ApplicationLifecycleChangedEvent(message);
	                break;
                case Documa.communication.events.ApplicationEvents.APP_CHANGED:
                case Documa.communication.events.ApplicationEvents.ON_REQSMCDLS:
                case Documa.communication.events.ApplicationEvents.ON_RUNTIME_RESP:
                case Documa.communication.events.ApplicationEvents.ON_SDISTCHNGD:
                case Documa.communication.events.ApplicationEvents.ON_TRANSACTION_COMPLETED:
                case Documa.communication.events.ApplicationEvents.CHANNEL_CREATED:
                case Documa.communication.events.ApplicationEvents.CHANNEL_REMOVED:
                case Documa.communication.events.ApplicationEvents.LOWBATTERY:
                case Documa.communication.events.ApplicationEvents.HISTINIT:
                case Documa.communication.events.ApplicationEvents.HISTUPDATE:
                case Documa.communication.events.ApplicationEvents.OPTIONSELECTED:
                case Documa.communication.events.ApplicationEvents.UPDATE_MIGRATIONPROGRESS:
                case Documa.communication.events.ApplicationEvents.CANCEL_MIGRATIONPROGRESS:
                case Documa.communication.events.ApplicationEvents.REVERSE_MIGRATIONPROGRESS:
                case Documa.communication.events.ApplicationEvents.CLOSE_MIGRATIONWINDOW:
                    evt = new Documa.communication.events.ApplicationEvent(message);
                    break;
                ////////////////////////////////////////////////
                // Application level server-side error events //
                ////////////////////////////////////////////////
                case Documa.communication.events.ApplicationEvents.APP_ERROR:
                    evt = new Documa.communication.events.ApplicationErrorEvent(message);
                    break;
                // TODO: add here additional events and decide if it is a system or application
                // level event
            }
            return evt;
        },
        /**
         * Creates an event that represents the state after a component was successfully
         * initialized. This event will be send to the server that decides about the
         * current application state considering every integration state of each mashup
         * component. Only if all components were integrated an application can pass over
         * into the running state.
         *
         * @param {String} appinstid application's instance id
         * @param {String} appid application's identifier
         * @param {String} appversion application's version number
         * @param {String} cinstid component's instance id
         */
        createComponentIntializedEvent: function (appinstid, appid, appversion, cinstid) {
            let payload = {
                id: appid,
                version: appversion,
                instid: appinstid,
                change: Documa.communication.events.ApplicationChangeType.CMP_LIFECYCLE_CHANGED,
                component: cinstid,
                state: Documa.components.ComponentLifecycleStates.INITIALIZED
            };
            return this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
                Documa.communication.events.ApplicationEvents.APP_CHANGED,
                payload);
        },
        /**
         * Creates an event that represents the initiation of a component instance.
         *
         * @param {Documa.context.ApplicationContext} appcontext current application context
         * @param {String} cinstid component instance id
         *
         * @return {Documa.communication.events.Event} component lifecycle event representing the create of a specific
         * component instance
         */
        createComponentInstantiatedEvent: function (appcontext, cinstid) {
            let payload = {
                id: appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_ID),
                version: appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION),
                instid: appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID),
                change: Documa.communication.events.ApplicationChangeType.CMP_LIFECYCLE_CHANGED,
                component: cinstid,
                state: Documa.components.ComponentLifecycleStates.INSTANTIATED
            };
            return this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
                Documa.communication.events.ApplicationEvents.APP_CHANGED, payload);
        },

        /**
         * Creates response event that should correlate with a runtime request.
         *
         * @param {String} appinstid application's instance id
         * @param {String} appid application's identifier
         * @param {String} appversion application's version number
         * @param {Object} reqSender request sender/response receiver
         * @param {String} action name of requested action that created the response data
         * @param {Object} reqid id of previous request (local request timestamp)
         * @param {Object} response response payload
         */
        createRuntimeResponse: function (appinstid, appid, appversion, reqSender, action, reqid, status, response) {
            let payload = {
                id: appid,
                version: appversion,
                instid: appinstid,
                status: status,
                action: action,
                reqsndr: reqSender,
                reqid: reqid,
                resp: response
            };
            return this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
                Documa.communication.events.ApplicationEvents.ON_RUNTIME_RESP,
                payload);
        },

        /**
         * @param {Documa.components.ComponentMessage} message
         * @returns {Documa.communication.events.ContextEvent}
         */
        createContextEvent: function (message) {
            return new Documa.communication.events.ContextEvent(message);
        },

        /**
         * Creates an application event containing the requested migration options.
         * @param {Array.<Documa.distribution.migration.options.MigrationOption>} options
         * @returns {Documa.communication.events.ApplicationEvent}
         */
        createMigrationOptionsReadyEvent: function (options) {
            let payload = {options: options};
            return this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
                Documa.communication.events.ApplicationEvents.MIGROPTS_READY, payload);
        },

        createCancelMigrationEvent: function (appid, appinstid, appversion, migrationId, cancelCause, cancelCauseText, component) {
            let payload = {
                APP_ID: appid,
                APP_VERSION: appversion,
                APP_INSTID: appinstid,
                MIGRATION_ID: migrationId,
                CANCEL_CAUSE: cancelCause,
                CANCEL_CAUSE_TEXT: cancelCauseText,
                COMPONENT: component,
            };
            return this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
                Documa.communication.events.ApplicationEvents.CANCEL_MIGRATIONPROGRESS,
                payload);
        },

        createCloseMigrationEvent: function (appid, appinstid, appversion) {
            let payload = {
                APP_ID: appid,
                APP_VERSION: appversion,
                APP_INSTID: appinstid,
            };
            return this.create(Documa.communication.MessageFieldValues.APP_LEVEL,
                Documa.communication.events.ApplicationEvents.CLOSE_MIGRATIONWINDOW,
                payload);
        },
    };
})());

