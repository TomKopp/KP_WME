Documa.components.HotelDetails = class extends Documa.components.MashupComponent {
    constructor() {
        // call parent class constructor
        super();
        this.broker = null;
        this.context = null;
        this.angularIFrame = null;
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
        this.log = ctx.getAttribute(Documa.components.ContextConstants.LOG);
        this.broker = ctx.getAttribute("EventHandler");
        // firing initialized lifecycle event
        super.fireInitialized();
        
        var self = this;

        // test external button
        $(document).ready(function () {
            // listen to events from own window due to CORS policy which forbids to listen to iframe
            // events which are not from the same origin
            window.addEventListener('message', function(data) {
                if (!data.data) return;
                self.sendUpdateTripSectionsEvent(event, self);
            });
        });
        
        $('html').css("width", "100%");
    	$('html').css("height", "100%");
    	$('body').css("width", "100%");
    	$('body').css("height", "100%");
        $('<iframe type="text/html" src="https://svn.mmt.inf.tu-dresden.de/CRUISe/components/branches/DEV_DTRP/DTRP_UI_HotelDetails/angular/index.html" frameborder="0" scrolling="no" id="documa_sc" style="width: 100%; height: 100%;"></iframe>').appendTo('#' + this.context.getAttribute("renderTargetId"));
        this.angularIFrame = $('iframe#documa_sc')[0];
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
        window.removeEventListener('updateTripSections', this.sendUpdateTripSectionsEvent);
    }

    sendUpdateTripSectionsEvent(event, self) {
        if (event != null && event.data != null) {
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
        if (propName === 'textContent') {
            return this.textContent;
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
        console.log(msg);
        switch (operationName) {
            case 'onUpdateTripSections':
                self.log.info('HOTEL: Operation onUpdateTripSections invoked');
                if (msg != null)
                    this.angularIFrame.contentWindow.postMessage(JSON.stringify(msg.message.body), '*');
                // if (msg != null)
                //     this.angularIFrame.contentWindow.postMessage(msg, '*');
                // else
                //     self.log.info("Other Component seems to have sent a wrong event");
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
    
    updateTripSections(sections) {
        console.log("update works");
        self.angularIFrame.contentWindow.postMessage("TESTMESSAGE", '*');
    }
}