Ext.namespace('Documa.ui.migration');

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

Documa.require('Documa.ui.migration.MigrationOptionsView');

/**
 * This class creates and controls the Configuration contents
 * @class Documa.ui.migration.MigrationViewManager
 *
 */
Documa.ui.migration.MigrationOptionsManager = Ext.extend(Object, ( function () {
    let TAG = 'Documa.ui.migration.MigrationOptionsManager';
    let _log = Documa.util.Logger;

    return {
        /**
         * Constructor for MigrationOptionsManager
         * @constructs Documa.ui.migration.MigrationViewManager
         */
        constructor: function (migrationManager) {
            _log.debug(TAG, "... constructing.");
            this._migrationManager = migrationManager;
            this._optionsView = new Documa.ui.migration.MigrationOptionsView(this);
        },

        /**
         * Get migration options view.
         * @memberOf Documa.ui.migration.MigrationOptionsManager
         * @returns {Documa.ui.migration.MigrationProgressView|*}
         */
        getView: function () {
            return this._optionsView;
        },

        /**
         *
         * Setter method for migration options.
         * @memberOf Documa.ui.migration.MigrationOptionsManager
         */
        setMigrationOptions: function () {
            this._optionsView.setMigrationOptions(this._migrationManager.getMigrationOptions());
        },

        /**
         * Select a migration option,  triggers method for sending selected option to server
         * @memberOf Documa.ui.migration.MigrationOptionsManager
         * @param {String} id ID of the selected option
         * @param {Documa.distribution.migration.options.MigrationOption} option Object of the selected migration
         */
        selectOption: function (id, option) {
            _log.debug("selectOption()");
            //this._migrationManager.startMigration(option);
            this.sendOptionSelectedEvent(id, option);
        },

        /**
         * Sends an event to the server, which indicates that a migration option has been selected
         * @memberOf Documa.ui.migration.MigrationOptionsManager
         * @param {String} id ID of the selected migration option
         * @param {Documa.distribution.migration.options.MigrationOption} option Object of selected migration option.
         */
        sendOptionSelectedEvent: function (id, option) {        	
        	_log.debug("Option selected: "+id);
        	let app_id = Documa.RuntimeManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_ID);
            let instID = Documa.RuntimeManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
            let version = Documa.RuntimeManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
            let _ef = new Documa.communication.events.EventFactory();
            let optRdyEvent = _ef.create(
                Documa.communication.MessageFieldValues.APP_LEVEL,
                Documa.communication.events.ApplicationEvents.OPTIONSELECTED,
				{"APP_ID": app_id, "APP_INSTID": instID, "APP_VERSION": version, "OPTION_ID": id, "MIGRATION_OPTION": option.serialize()}
            );

            Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(optRdyEvent);
        },


        /**
         * Getter method to get a specific migration option from the migration options array.
         * @memberOf Documa.ui.migration.MigrationOptionsManager
         * @param {string} id ID of the migration option, you want to get
         * @returns {boolean | {_id:string, _srcClient:string, _distributions:Array.<Object>}} migrationOption False if no migration option has been found, migration option object if found
         */
        getMigrationOption: function (id) {
            //check if migration options set
            let options = this._migrationManager.getMigrationOptions();
            if(options.length != 0){
                // iterate through options
                for(let i = 0; i < options.length; i++){
                    if(options[i].getId() == id.trim()){
                        return (options[i]);
                    }
                }
                return false;
            }
        }
    };
}()));
