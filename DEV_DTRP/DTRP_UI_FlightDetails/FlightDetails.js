Documa.components.FlightDetails = function() {

    return class extends Documa.components.MashupComponent {

        constructor() {
            // call parent class constructor
            super();
            this.context = null;
            this.log = null;
            this.vue = null;
            this.rtid = null;
            this.proxy = null;
            this.title = null;
            this.iframe = null;
            this.broker = null;
            this.serviceAccess = null;
            this.vueIframe = null;
        }

        /**
         * The initialization method of the component.
         *
         * @function
         * @param ctx the component context for
         * access to the runtime's functionality
         */
        init(ctx) {
            super.init(ctx);
            this.context = ctx;

            this.broker = ctx.getAttribute("EventHandler");
            this.serviceAccess = ctx.getAttribute("ServiceAccess");
            this.log = ctx.getAttribute( Documa.components.ContextConstants.LOG);
            this.rtid = ctx.getAttribute(Documa.components.ContextConstants.RTID);
            this.log.info("This is the RTID: " + this.rtid);
            this.iframe = $('iframe#frame_sp1')[0];
            $("#frame_sp1").attr('scrolling', 'no');

            // firing initialized lifecycle event
            super.fireInitialized();

            $('html').css("width", "100%");
            $('html').css("height", "100%");
            $('body').css("width", "100%");
            $('body').css("height", "100%");

            this.integrateVueProjectFiles();
            this.initFrameworkCommunication();
        }

        /**
         * Called by the runtime environment to show the UI component.
         * @function
         */
        show() {
        }

        /**
         * Called by the runtime environment to hide the UI component.
         * @function
         */
        hide() {

        }

        /**
         * Called by the runtime environment to enable the UI component (indicating that
         * the component should react on interactions).
         * @function
         */
        enable() {

        }

        /**
         * Called by the runtime environment to disable the UI component (indicating that
         * the component should not react on interactions).
         * @function
         */
        disable() {

        }

        /**
         * Method called when the component is removed from the application.
         * All internally allocated resources have to be disposed.
         *
         * @function
         */
        dispose() {
            this.context = null;

            // remove all global event listeners when component gets destroyed
            window.removeEventListener('message', this.sendUpdateTripSectionsEvent);
        }

        getDragData() {

        }

        setProperty(propName, propValue) {
            if (propName === 'width') {
                this.width = parseInt(propValue);
            }
            if (propName === 'height') {
                this.height = parseInt(propValue);
            }
            if (propName === 'title') {
                this.title = propValue;
            }
            if (propName === 'textContent') {
                this.textContent = propValue;
            }
        }

        getProperty(propName) {
            if (propName === 'width') {
                return this.width;
            }
            if (propName === 'height') {
                return this.height;
            }
            if (propName === 'title') {
                return this.title;
            }
            if (propName === 'tripSections') {
                return this.tripSections;
            }
        }

        /**
         * The method to invoke any operation of this component.
         *
         * @param {String} operationName the name of the operation to be invoked
         * @param msg the message object as delivered by the
         * event. the message's body is an associative array of parameters (names as
         * defined in MCDL).
         */
        invokeOperation(operationName, msg) {
            var self = this;

            switch (operationName) {
                case 'onUpdateTripSections':
                    self.log.info('Operation onUpdateTripSections invoked');
                    if (msg != null)
                        this.vueIframe.contentWindow.postMessage(JSON.stringify(msg.message.body.tripSections), '*');
                    else
                        self.log.info("Other Component seems to have sent a wrong event");
                    break;
                default:
                    self.log.info('Operation not implemented');
            }

        }

        load() {


        }

        showOverview() {

        }

        close() {

        }

        /**
         * Sends trip sections to subscribers; avoid handling message event which is sent by the component itself
         * @param event
         * @param self
         */
        sendUpdateTripSectionsEvent(event, self) {

            if (event != null && event.data != null && event.data.sections != null) {
                self.log.info(JSON.stringify(event.data, null, 4));

                let msg = self.broker.createMessage();
                self.log.info("Message was created.");
                msg.setName("updateTripSections");
                msg.appendToBody("tripSections", event.data);

                self.broker.publish(msg);
                self.log.info("Message was sent.")
            } else {
                self.log.info("Event received from Vue seems to be null or the wrong one.");
            }
        }

        initFrameworkCommunication() {
            var self = this;

            // add necessary event listener
            $(document).ready(function () {
                // listen to events from own window due to CORS policy which forbids to listen to iframe
                // events which are not from the same origin
                window.addEventListener('message', function() {
                    self.sendUpdateTripSectionsEvent(event, self);
                });
            });

            this.log.info("Vue IFrame Event Listener added");
        }

        /**
         * Append Vue-based application
         */
        integrateVueProjectFiles() {
            $('<iframe type="text/html" src="https://svn.mmt.inf.tu-dresden.de/CRUISe/components/branches/DEV_DTRP/DTRP_UI_FlightDetails/vue/index.html" frameborder="0" scrolling="yes" id="documa_sc" style="width: 100%; height: 100%;"></iframe>').appendTo('#' + this.context.getAttribute("renderTargetId"));
            this.vueIframe = $('iframe#documa_sc')[0];
        }

    }

}();
