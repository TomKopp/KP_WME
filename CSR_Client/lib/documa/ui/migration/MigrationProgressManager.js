Ext.namespace('Documa.ui.migration');

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

Documa.require('Documa.ui.migration.MigrationProgressView');
Documa.require('Documa.ui.migration.MigrationComponent');
Documa.require('Documa.ui.migration.MigrationStatus');
Documa.require('Documa.distribution.migration.options.MigrationOption');


/**
 * @typedef {object} Documa.ui.migration.MigrationUpdateType
 * @interface
 * @property {String} migrationId
 * @property {String} container
 * @property {String} component
 * @property {String} status
 * @property {String} type
 */

/**
 * @typedef {object} Documa.ui.migration.MigrationReverseType
 * @interface
 * @property {String} migrationId
 * @property {String} container
 * @property {String} component
 * @property {String} status
 * @property {String} type
 */

/**
 * @typedef {object} Documa.ui.migration.MigrationCancelType
 * @interface
 * @property {String} MIGRATION_ID
 * @property {String} CANCEL_CAUSE_TEXT
 * @property {String} CANCEL_CAUSE
 * @property {String} COMPONENT
 */

/**
 * This class creates and controls the migration progress.
 * @class Documa.ui.migration.MigrationProgressManager
 */
Documa.ui.migration.MigrationProgressManager = Ext.extend(Object, (function () {
        let TAG = 'Documa.ui.migration.MigrationProgressManager';
        let _log = Documa.util.Logger;

        ///////////////////////////
        // private class members //
        ///////////////////////////

        /**
         * Migration manager.
         * @type {Documa.ui.migration.MigrationManager}
         * @private
         */
        let _migrationManager = null;

        /**
         * Migration components.
         * @type {Array.<Documa.ui.migration.MigrationComponent>}
         * @private
         */
        let _migrationComponents = [];

        /**
         * Event factory.
         * @type {Documa.communication.events.EventFactory}
         * @private
         */
        let _eventFactory = null;

        /**
         * Returns migration status type.
         * @param {string} value
         * @private
         * @returns {{level: number, message: string}}
         */
        function getMigrationStatusType(value) {
            switch (value) {
                case "run_old":
                    return Documa.ui.migration.MigrationStatusType.REVERSE_FINISH;
                case "block":
                    return Documa.ui.migration.MigrationStatusType.BLOCK;
                case "serialise":
                    return Documa.ui.migration.MigrationStatusType.SERIALISE;
                case "disintegrate":
                    return Documa.ui.migration.MigrationStatusType.DISINTEGRATE;
                case "reintegrate":
                    return Documa.ui.migration.MigrationStatusType.REINTEGRATE;
                case "initialize":
                    return Documa.ui.migration.MigrationStatusType.INITIALIZE;
                case "transfer_state":
                    return Documa.ui.migration.MigrationStatusType.TRANSFER_STATE;
                case "unblock":
                    return Documa.ui.migration.MigrationStatusType.UNBLOCK;
                case "run_new":
                    return Documa.ui.migration.MigrationStatusType.RUN;
                default:
                    return Documa.ui.migration.MigrationStatusType.DEFAULT;
            }
        }

        /**
         * Returns migration condition type.
         * @param {string} value
         * @private
         * @returns {{id: number, level: number, success: boolean, styleClass: string}}
         */
        function getMigrationConditionType(value) {
            switch (value) {
                case "success":
                    return Documa.ui.migration.MigrationConditionType.SUCCESS;
                case "warning":
                    return Documa.ui.migration.MigrationConditionType.WARNING;
                case "error":
                    return Documa.ui.migration.MigrationConditionType.ERROR;
                case "reverse":
                    return Documa.ui.migration.MigrationConditionType.REVERSE;
                case "reverse_success":
                    return Documa.ui.migration.MigrationConditionType.REVERSE_SUCCESS;
                default:
                    return Documa.ui.migration.MigrationConditionType.DEFAULT;
            }
        }

        /**
         * Send migration cancel event.
         * @private
         */
        function sendCancelMigrationEvent() {
            _log.debug(TAG, "... migration cancel event fire.");
            let event = _eventFactory.createCancelMigrationEvent(
                _migrationManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_ID),
                _migrationManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_INSTID),
                _migrationManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_VERSION),
                _migrationComponents[0].getId(),
                'canceled',
                'Der Migrationsprozess wurde vom Nutzer abgebrochen.',
                '');
            Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(event);
        }

        /**
         * Send migration close event.
         * @private
         */
        function sendCloseMigrationEvent() {
            _log.debug(TAG, "... migration close event fire.");

            let event = _eventFactory.createCloseMigrationEvent(
                _migrationManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_ID),
                _migrationManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_INSTID),
                _migrationManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_VERSION));
            Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(event);
        }

        /**
         * Returns message type.
         * @private
         * @param {string} id
         */
        function getMessageType(id) {
            for (let key in Documa.ui.migration.MigrationProgressMessageType) {
                if (Documa.ui.migration.MigrationProgressMessageType.hasOwnProperty(key)) {
                    if (Documa.ui.migration.MigrationProgressMessageType[key].id_string = id) {
                        return Documa.ui.migration.MigrationProgressMessageType[key]
                    }
                }
            }
        }

        ////////////////////
        // public methods //
        ////////////////////
        return {
            /**
             * Ctor.
             * @constructs Documa.ui.migration.MigrationProgressManager
             */
            constructor: function (migrationManager) {
                _log.debug(TAG, "... constructing.");

                /**
                 * Create view.
                 * @type {Documa.ui.migration.MigrationProgressView}
                 */
                this._progressView = new Documa.ui.migration.MigrationProgressView(this);

                /**
                 * Is error.
                 * @type {boolean}
                 * @private
                 */
                this._error = false;

                // Set migrationManager
                _migrationManager = migrationManager;

                // Create event factory
                _eventFactory = new Documa.communication.events.EventFactory();

                // set application context
                _migrationManager.setApplicationContext(Documa.RuntimeManager.getApplicationContext());
            },

            /**
             * Returns migration components.
             * @memberOf Documa.ui.migration.MigrationProgressManager#
             * @returns {Array.<Documa.ui.migration.MigrationComponent>}
             */
            getMigrationComponents: function () {
                return _migrationComponents;
            },

            /**
             * Return migration component by id.
             * @memberOf Documa.ui.migration.MigrationProgressManager#
             * @param {String} migrationId
             * @returns {Documa.ui.migration.MigrationComponent}
             */
            getMigrationComponent: function (migrationId) {
                for (let key in _migrationComponents) {
                    if (_migrationComponents.hasOwnProperty(key)) {
                        if (_migrationComponents[key].getId() == migrationId) {
                            return _migrationComponents[key];
                        }
                    }
                }
            },

            /**
             * Set migration components.
             * @memberOf Documa.ui.migration.MigrationProgressManager#
             * @param {Array.<Documa.distribution.migration.options.MigrationOption> | Documa.distribution.migration.options.MigrationOption} migrationComponents
             */
            setMigrationComponents: function (migrationComponents) {
                _log.debug(TAG, "... set migrations.");

                // reset array
                _migrationComponents = [];

                // if more than one migration
                if (typeof migrationComponents == Array) {
                    for (let key in migrationComponents) {
                        if (migrationComponents.hasOwnProperty(key)) {
                            _migrationComponents.push(new Documa.ui.migration.MigrationComponent(migrationComponents[key].serialize()));
                        }
                    }
                    // if one migration
                } else {
                    _migrationComponents.push(new Documa.ui.migration.MigrationComponent(migrationComponents.serialize()));
                }
            },

            /**
             * Start migration progress by set migration data in view.
             * @memberOf Documa.ui.migration.MigrationProgressManager#
             */
            startMigrationProgress: function () {
                if (_migrationComponents) {
                    _log.debug(TAG, "... starting progress.");

                    this._error = false;
                    this._progressView.setMigrationComponents(_migrationComponents);
                    this._progressView.setMessageComponent(Documa.ui.migration.MigrationProgressMessageType.IN_PROCESS);
                    this._progressView.showMessageComponent();
                } else {
                    _log.error(TAG, "... migration option must set.");
                }
            },

            /**
             * Get migration progress view.
             * @memberOf Documa.ui.migration.MigrationProgressManager#
             * @returns {Documa.ui.migration.MigrationProgressView|*}
             */
            getView: function () {
                return this._progressView;
            },

            /**
             * Cancel of the migration process.
             * @memberOf Documa.ui.migration.MigrationProgressManager#
             * @param {Documa.ui.migration.MigrationCancelType} jsonData
             */
            cancelMigrationProgress: function (jsonData) {
                if (!this._error) {
                    _log.debug(TAG, "... migration progress cancel.");

                    this._progressView.showWaitingButton();
                    this._error = true;

                    this._progressView.setMessageComponent(getMessageType(jsonData.CANCEL_CAUSE_TEXT));
                    this._progressView.showMessageComponent();
                }
            },

            /**
             * User initiated cancel of the migration process.
             * @memberOf Documa.ui.migration.MigrationProgressManager##
             */
            cancelingMigrationProgress: function () {
                if (!this._error) {
                    _log.debug(TAG, "... migration progress canceling.");

                    sendCancelMigrationEvent();
                }
            },

            /**
             * User initiated close of the migration process.
             * @memberOf Documa.ui.migration.MigrationProgressManager#
             */
            closeMigrationProgress: function () {
                _log.debug(TAG, "... migration progress canceled.");

                sendCloseMigrationEvent();
            },

            /**
             * Update migration items.
             * @memberOf Documa.ui.migration.MigrationProgressManager#
             * @param {Documa.ui.migration.MigrationUpdateType} jsonData
             */
            update: function (jsonData) {
                if (!this._error) {
                    const statusType = getMigrationStatusType(jsonData.status);
                    const conditionType = getMigrationConditionType(jsonData.type);

                    const migration = this.getMigrationComponent(jsonData.migrationId);
                    const distribution = migration.getDistributionOption(jsonData.container);
                    const componentItem = distribution.getComponentItem(jsonData.component);

                    if (componentItem.getStatus().getStatusType().level <= statusType.level) {
                        this.setComponentItemStatus(componentItem, statusType, conditionType)
                    }

                    if (conditionType.id == Documa.ui.migration.MigrationConditionType.ERROR.id) {
                        this._error = true;
                        this._progressView.setMessageComponent(Documa.ui.migration.MigrationProgressMessageType.CANCEL_ERROR);
                        this._progressView.showMessageComponent();
                        this._progressView.showWaitingButton();
                    }

                    if (componentItem.getStatus().getStatusType().id == Documa.ui.migration.MigrationStatusType.RUN.id) {
                        let allFinish = _migrationComponents[0].getMigrateItems().every(function (element) {
                            return element.getStatus().getStatusType().id == Documa.ui.migration.MigrationStatusType.RUN.id;
                        });

                        if (allFinish) {
                            this._progressView.showSuccessButton();
                            this._progressView.setMessageComponent(Documa.ui.migration.MigrationProgressMessageType.SUCCESS);
                            this._progressView.showMessageComponent();
                        }
                    }
                }
            },

            /**
             * Reverse migration items.
             * @memberOf Documa.ui.migration.MigrationProgressManager#
             * @param {Documa.ui.migration.MigrationReverseType} jsonData
             */
            reverse: function (jsonData) {
                const statusType = getMigrationStatusType(jsonData.status);
                const conditionType = getMigrationConditionType(jsonData.type);

                const migration = this.getMigrationComponent(jsonData.migrationId);
                const distribution = migration.getDistributionOption(jsonData.container);
                const componentItem = distribution.getComponentItem(jsonData.component);

                if (componentItem.getStatus().getStatusType().level >= statusType.level) {
                    this.setComponentItemStatus(componentItem, statusType, conditionType)
                }

                if (componentItem.getStatus().getConditionType().id == Documa.ui.migration.MigrationConditionType.REVERSE_SUCCESS.id) {
                    let allFinish = _migrationComponents[0].getMigrateItems().every(function (element) {
                        return element.getStatus().getConditionType().id == Documa.ui.migration.MigrationConditionType.REVERSE_SUCCESS.id;
                    });

                    if (allFinish) {
                        this._progressView.showSuccessButton();
                        this._progressView.setMessageComponent(Documa.ui.migration.MigrationProgressMessageType.REVERSE_SUCCESS);
                        this._progressView.showMessageComponent();
                    }
                }

            },

            /**
             * Sets migration item status.
             * @memberOf Documa.ui.migration.MigrationProgressManager#
             * @param componentItem
             * @param statusType
             * @param conditionType
             */
            setComponentItemStatus: function (componentItem, statusType, conditionType) {
                this._progressView.apply(function () {
                    componentItem.getStatus().setStatusType(statusType);
                    componentItem.getStatus().setConditionType(conditionType);
                });
            },

            /**
             * Reset migration progress.
             * @memberOf Documa.ui.migration.MigrationProgressManager#
             */
            reset: function () {
                _log.debug(TAG, "... migration progress reset.");

                this._progressView.reset();
                this._error = false;
                _migrationComponents = [];
            },

        };
    }()
));
