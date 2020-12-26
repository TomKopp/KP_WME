Documa.components.TravelCatalog = class extends Documa.components.MashupComponent {

    /**
     * The initialization method of the component.
     *
     * @function
     * @param ctx the component context for
     * access to the runtime's functionality
     * @returns {any} desc
     */
    init(ctx) {
        super.init(ctx);
        this._renderTargetId = ctx.getAttribute(Documa.components.ContextConstants.RTID);
        this._log = ctx.getAttribute(Documa.components.ContextConstants.LOG);
        this._serviceAccess = ctx.getAttribute(Documa.components.ContextConstants.SERVICEACCESS);

        document.addEventListener('updateTripSections', ({ detail: trip }) => this.updateTripSections(trip));

        this.fireInitialized();
    }

    /**
     * Called by the runtime environment to show the UI component.
     * @function
     */
    show() {
        // window.TravelCatalogRender(document.getElementById(this._renderTargetId));
        window.TravelCatalogRender(this);
    }

    /**
     * Called by the runtime environment to hide the UI component.
     * @function
     */
    hide() { }

    /**
     * Called by the runtime environment to enable the UI component (indicating that
     * the component should react on interactions).
     * @function
     */
    enable() { }

    /**
     * Called by the runtime environment to disable the UI component (indicating that
     * the component should not react on interactions).
     * @function
     */
    disable() { }

    /**
     * Method called when the component is removed from the application.
     * All internally allocated resources have to be disposed.
     *
     * @function
     */
    dispose() { }

    /**
     * is called by the runtime environment to get the currenty dragged object
     * @function
     */
    getDragData() {

    }

    /**
     * setter method for each property of the component. e Property der Komponente. name refers to the name of the class property to be set, value represents the new value to be set
     * @param {*} propName no freakin idea
     * @param {*} propValue no freakin idea
     */
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

    /**
     * getter method for each property of the component. name refers to the name of the class property to be read
     * @param {*} propName no freakin idea
     */
    getProperty(propName) {
        return this[String(propName)];
    }

    /**
     * The method to invoke any operation of this component.
     *
     * @param {String} operationName the name of the operation to be invoked
     * @param message the message object as delivered by the
     * event. the message's body is an associative array of parameters (names as
     * defined in MCDL).
     */
    invokeOperation(operationName, event) {
        console.warn('%cTravelCatalog: ', 'background-color: lightblue;', event);
        document.dispatchEvent(new CustomEvent(operationName, { detail: event.message.body.tripSections }));
    }

    /**
     * no representation in documentation
     */
    load() { }

    showOverview() { }

    close() { }

    /**
     * Method raises an updateTripSections event in the runtime application
     * @param {Object} trip current trip obj that is being modified
     */
    updateTripSections(trip) {
        const msg = this._broker.createMessage();
        msg.setName('updateTripSections');
        msg.appendToBody('tripSections', trip);
        this._broker.publish(msg);
    }

}
