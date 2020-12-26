Ext.namespace('Documa.ui.migration');

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

Documa.require('Documa.ui.migration.MigrationDialogView');
Documa.require('Documa.ui.migration.MigrationProgressManager');
Documa.require('Documa.ui.migration.MigrationOptionsManager');

/**
 * This class creates and controls the migration process.
 * @class Documa.ui.migration.MigrationManager
 */
Documa.ui.migration.MigrationManager = Ext.extend(Object, (function () {
    const TAG = 'Documa.ui.migration.MigrationManager';
    const _log = Documa.util.Logger;

    return {
        /**
         * Ctor.
         * @constructs Documa.ui.migration.MigrationManager
         * @param {Documa.ui.UIManager} uiManager
         */
        constructor: function (uiManager) {
            _log.debug(TAG, "... constructing.");

            /**
             * Set uiManager.
             * @type Documa.ui.UIManager
             * @private
             */
            this._uiManager = uiManager;

            /**
             * Create migration dialog.
             * @type Documa.ui.migration.MigrationDialogView
             * @private
             */
            this._dialogView = new Documa.ui.migration.MigrationDialogView(this);

            /**
             * Create migration progress manager.
             * @type Documa.ui.migration.MigrationProgressManager
             * @private
             */
            this._progressManager = new Documa.ui.migration.MigrationProgressManager(this);

            /**
             * Create migration option manager.
             * @type Documa.ui.migration.MigrationOptionsManager
             * @private
             */
            this._optionsManager = new Documa.ui.migration.MigrationOptionsManager(this);

            /**
             * Migration options.
             * @type {Array}
             * @private
             */
            this._migrationOptions = [];

            /**
             * Current application context.
             * @type {Documa.context.ApplicationContext}
             * @private
             */
            this._appcontext = null;

            /**
             * Is migration run.
             * @type {boolean}
             * @private
             */
            this._isMigrate = false;
        },

        /**
         * Sets current application context.
         * @memberOf Documa.ui.migration.MigrationManager#
         * @param {Documa.context.ApplicationContext} appContext
         */
        setApplicationContext: function (appContext) {
            this._appcontext = appContext;
        },

        /**
         * Returns current application context.
         * @memberOf Documa.ui.migration.MigrationManager#
         * @returns {Documa.context.ApplicationContext}
         */
        getApplicationContext: function () {
            return this._appcontext;
        },

        /**
         * Set migration option.
         * @memberOf Documa.ui.migration.MigrationManager#
         * @param payload
         */
        setMigrationOptions: function (payload) {
            _log.debug(TAG, "... set migration options.");

            this._migrationOptions = [];
            for (let index in payload) {
                if (payload.hasOwnProperty(index)) {
                    this._migrationOptions.push(new Documa.distribution.migration.options.MigrationOption(payload[index]));
                }
            }
            this._optionsManager.setMigrationOptions();
        },

        /**
         * Return migration options.
         * @memberOf Documa.ui.migration.MigrationManager#
         * @returns {Array.<Documa.distribution.migration.options.MigrationOption>}
         */
        getMigrationOptions: function () {
            if (this._migrationOptions.length != 0) {
                return this._migrationOptions;
            }
        },

        /**
         * Setup functions after dialog directive is init.
         * @memberOf Documa.ui.migration.MigrationManager#
         */
        setup: function () {
            _log.debug(TAG, "... setup migration.");
            let self = this;

            // if dialog close over bootstrap function
            this._dialogView._$modal.on('hidden.bs.modal', function () {
                self._closeDialog();
            });
        },

        /**
         * Show migration dialog.
         * @memberOf Documa.ui.migration.MigrationManager#
         * @private
         */
        _showDialog: function () {
            // if not visible
            if (!this._dialogView.isVisible()) {
                // is not migrate
                if (!this._isMigrate) {
                    this._dialogView.showMigrationOptions();
                }
                // is migrate
                else {
                    this._dialogView.showMigrationProgress();
                }
            }
        },

        /**
         * Close migration dialog.
         * @memberOf Documa.ui.migration.MigrationManager#
         * @private
         */
        _closeDialog: function () {
            // if not visible
            if (this._dialogView.isVisible()) {
                this._dialogView.hide();
            }
        },

        /**
         * Show migration.
         * @memberOf Documa.ui.migration.MigrationManager#
         */
        showMigration: function () {
            _log.debug(TAG, "... show migration.");

            this._showDialog();
        },

        /**
         * Start migration.
         * @memberOf Documa.ui.migration.MigrationManager#
         * @param migrationOption
         */
        startMigration: function (migrationOption) {
            _log.debug(TAG, "... start migration process.");

            // if visible
            if (this._dialogView.isVisible()) {
                this._progressManager.setMigrationComponents(migrationOption);
                this._progressManager.startMigrationProgress();
                this._dialogView.showMigrationProgress();
                this._isMigrate = true;
            }
        },

        /**
         * Cancel migration process.
         * @memberOf Documa.ui.migration.MigrationManager#
         */
        cancelMigration: function (jsonData) {
            _log.debug(TAG, "... cancel migration process.");

            this._progressManager.cancelMigrationProgress(jsonData);
        },

        /**
         *
         * @memberOf Documa.ui.migration.MigrationManager#
         */
        closeMigration: function () {
            _log.debug(TAG, "... close migration process.");

            this._progressManager.reset();
            this._isMigrate = false;
            this.hideMigration();
        },

        /**
         *
         * @memberOf Documa.ui.migration.MigrationManager#
         */
        hideMigration: function () {
            _log.debug(TAG, "... hide migration process.");

            this._closeDialog();
        },

        /**
         * Return true or false if migration process migrate.
         * @memberOf Documa.ui.migration.MigrationManager#
         * @returns {boolean}
         */
        isMigration: function () {
            return this._isMigrate;
        },

        /**
         * Get migration dialog view.
         * @memberOf Documa.ui.migration.MigrationManager#
         * @returns {Documa.ui.migration.MigrationDialogView}
         */
        getView: function () {
            return this._dialogView;
        },

        /**
         * Get progress manager.
         * @memberOf Documa.ui.migration.MigrationManager#
         * @returns {Documa.ui.migration.MigrationProgressManager}
         */
        getProgressManager: function () {
            return this._progressManager;
        },

        /**
         * Get options manager.
         * @memberOf Documa.ui.migration.MigrationManager#
         * @returns {Documa.ui.migration.MigrationOptionsManager}
         */
        getOptionsManager: function () {
            return this._optionsManager;
        }
    };
}()));
