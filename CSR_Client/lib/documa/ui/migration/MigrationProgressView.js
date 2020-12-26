Ext.namespace("Documa.ui.migration");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

/**
 * Values for message types.
 * @static
 * @type {{CANCEL: {id_string: string, text: string, styleClass: string}, CANCEL_ERROR: {id_string: string, text: string, styleClass: string}, IN_PROCESS: {id_string: string, text: string, styleClass: string}, SUCCESS: {id_string: string, text: string, styleClass: string}, REVERSE_SUCCESS: {id_string: string, text: string, styleClass: string}, WARNING: {id_string: string, text: string, styleClass: string}, DEFAULT: {id_string: string, text: string, styleClass: string}}}
 */
Documa.ui.migration.MigrationProgressMessageType = {
    CANCEL: {
        id_string: "canceled",
        text: "Der Migrationsprozess wurde vom Nutzer abgebrochen. Migration wird rückgängig gemacht.",
        styleClass: "alert-danger"
    },
    CANCEL_ERROR: {
        id_string: "canceled",
        text: "Der Migrationsprozess wurde aufgrund eines Fehlers abgebrochen. Migration wird rückgängig gemacht.",
        styleClass: "alert-danger"
    },
    IN_PROCESS: {
        id_string: "inProcess",
        text: "Der Migrationsprozess wird ausgeführt.",
        styleClass: "alert-info"
    },
    SUCCESS: {
        id_string: "success",
        text: "Der Migrationsprozess wurde erfolgreich ausgeführt.",
        styleClass: "alert-success"
    },
    REVERSE_SUCCESS: {
        id_string: "reverse_success",
        text: "Der Migrationsprozess wurde abgebrochen und erfolgreich zurückgeführt.",
        styleClass: "alert-success"
    },
    WARNING: {
        id_string: "warning",
        text: "... .",
        styleClass: "alert-warning"
    },
    DEFAULT: {
        id_string: "default",
        text: "",
        styleClass: ""
    }
};

/**
 * This class is the view for migration progress.
 * @class Documa.ui.migration.MigrationProgressView
 */
Documa.ui.migration.MigrationProgressView = Ext.extend(Object, function () {
    const TAG = "Documa.ui.migration.MigrationProgressView";
    const _log = Documa.util.Logger;

    ///////////////////////////
    // private class members //
    ///////////////////////////

    /**
     * Progress manager.
     * @type {Documa.ui.migration.MigrationProgressManager}
     * @private
     */
    let _progressManager = null;

    ////////////////////
    // public methods //
    ////////////////////
    return {
        /**
         * Ctor.
         * @constructs Documa.ui.migration.MigrationProgressView
         * @param {Documa.ui.migration.MigrationProgressManager} manager
         */
        constructor: function (manager) {
            _log.debug(TAG, "... constructing.");

            /**
             *
             * @type {$rootScope.Scope}
             * @private
             */
            this._scope = null;
            this._elem = null;
            this._attr = null;

            /**
             * Is extended view in dialog.
             * @type {boolean}
             * @private
             */
            this._isExtendedView = false;

            // set progress manager
            _progressManager = manager;

        },

        /**
         * Initiate dialog.
         * @memberOf Documa.ui.migration.MigrationProgressView#
         * @param {$rootScope.Scope} scope
         * @param {Array.<Documa.ui.migration.MigrationComponent>} scope.migrationComponents
         * @param {Object} scope.button
         * @param {string} scope.button.text
         * @param {jQuery} elem
         * @param {Object} attr
         */
        setup: function (scope, elem, attr) {
            /**
             * @type {Documa.ui.migration.MigrationProgressView}
             */
            let self = this;

            // set
            this._scope = scope;
            this._elem = elem;
            this._attr = attr;

            /**
             * Migration components.
             * @type {Array.<Documa.ui.migration.MigrationComponent>}
             */
            this._scope.migrationComponents = null;

            /**
             * Values for details button.
             * @type {{text: string, iconClass: string}}
             */
            this._scope.button_details = {
                text: "More details",
                iconClass: "glyphicon-chevron-down",
            };

            /**
             * Values for cancel button.
             * @type {{show: boolean}}
             */
            this._scope.button_cancel = {
                show: true,
            };

            /**
             * Values for waiting button.
             * @type {{show: boolean}}
             */
            this._scope.button_wait = {
                show: false,
            };

            /**
             * Values for success button.
             * @type {{show: boolean}}
             */
            this._scope.button_success = {
                show: false,
            };

            /**
             * Sett message type.
             * @type {{id_string: string, text: string, styleClass: string}}
             */
            this._scope.message = Documa.ui.migration.MigrationProgressMessageType.DEFAULT;

            /**
             * If message show.
             * @type {boolean}
             */
            this._scope.messageShow = false;

            /**
             * @type {boolean}
             */
            this._scope.isExtendedView = this._isExtendedView;

            // button extended click event
            $("#migrationProgressButtonExtended").click(function (event) {
                self.toggleContent();
            });

            // button cancel click event
            $("#migrationProgressButtonCancel").click(function (event) {
                _progressManager.cancelingMigrationProgress();
            });

            // button success click event
            $("#migrationProgressButtonSuccess").click(function (event) {
                _progressManager.closeMigrationProgress();
            });
        },

        /**
         * Sets migration components.
         * @param {Array.<Documa.ui.migration.MigrationComponent>} migrationComponents
         * @memberOf Documa.ui.migration.MigrationProgressView#
         */
        setMigrationComponents: function (migrationComponents) {
            _log.debug(TAG, "... migration set.");

            let self = this;

            if (this._scope.$root.$$phase != '$apply' && this._scope.$root.$$phase != '$digest') {
                this._scope.$apply(function () {
                    self._scope.migrationComponents = migrationComponents;
                });
            }
        },

        /**
         * Sets message type.
         * @memberOf Documa.ui.migration.MigrationProgressView#
         * @param {{id_string: string, text: string, styleClass: string}} message
         */
        setMessageComponent: function (message) {
            _log.debug(TAG, "... migration progress message set.");

            let self = this;

            this._scope.$apply(function () {
                self._scope.message = message;
            });
        },

        /**
         * Show message.
         * @memberOf Documa.ui.migration.MigrationProgressView#
         */
        showMessageComponent: function () {
            _log.debug(TAG, "... migration progress message show.");

            let self = this;

            this._scope.$apply(function () {
                self._scope.messageShow = true;
            });
        },

        /**
         * Hide message.
         * @memberOf Documa.ui.migration.MigrationProgressView#
         */
        hideMessageComponent: function () {
            _log.debug(TAG, "... migration progress message hide.");

            let self = this;

            this._scope.$apply(function () {
                self._scope.messageShow = false;
            });
        },

        /**
         * Angular $apply.
         * @memberOf Documa.ui.migration.MigrationProgressView#
         */
        apply: function (func) {
            this._scope.$apply(func);
        },

        /**
         * Toggle between simple and complex content.
         * @memberOf Documa.ui.migration.MigrationProgressView#
         */
        toggleContent: function () {
            if (this._isExtendedView) {
                this._scope.button_details = {
                    text: "More details",
                    iconClass: "glyphicon-chevron-down"
                };
                this._hideExtendedView();
            } else {
                this._scope.button_details = {
                    text: "Less details",
                    iconClass: "glyphicon-chevron-up"
                };
                this._showExtendedView();
            }
        },

        /**
         * Show waiting button.
         * @memberOf Documa.ui.migration.MigrationProgressView#
         */
        showWaitingButton: function () {
            let self = this;

            this._scope.$apply(function () {
                self._scope.button_cancel.show = false;
                self._scope.button_wait.show = true;
                self._scope.button_success.show = false;
            })
        },

        /**
         * Show success button.
         * @memberOf Documa.ui.migration.MigrationProgressView#
         */
        showSuccessButton: function () {
            let self = this;

            this._scope.$apply(function () {
                self._scope.button_cancel.show = false;
                self._scope.button_wait.show = false;
                self._scope.button_success.show = true;
            })
        },

        /**
         * Show extended dialog.
         * @memberOf Documa.ui.migration.MigrationProgressView#
         * @private
         */
        _showExtendedView: function () {
            let self = this;

            this._scope.$apply(function () {
                self._isExtendedView = true;
                self._scope.isExtendedView = true;
            });
        },

        /**
         * Hide extended dialog.
         * @memberOf Documa.ui.migration.MigrationProgressView#
         * @private
         */
        _hideExtendedView: function () {
            let self = this;

            this._scope.$apply(function () {
                self._isExtendedView = false;
                self._scope.isExtendedView = false;
            });
        },

        /**
         * Resets migration progress view.
         * @memberOf Documa.ui.migration.MigrationProgressView#
         */
        reset: function () {
            this._scope.migrationComponents = null;

            this._scope.button_details = {
                text: "More details",
                iconClass: "glyphicon-chevron-down",
            };

            this._scope.button_cancel = {
                show: true,
            };

            this._scope.button_wait = {
                show: false,
            };

            this._scope.button_success = {
                show: false,
            };

            this.setMessageComponent(Documa.ui.migration.MigrationProgressMessageType.DEFAULT);
            this.hideMessageComponent();

            this._scope.isExtendedView = this._isExtendedView;
        }
    };
}());

/**
 * Definition of migration progress component.
 */
Documa.CSRM.directive("migrationProgress", function ($compile) {
    return {
        restrict: "E",
        templateUrl: "lib/documa/ui/templates/mui_migrationprogress.html",
        scope: {
            controller: "=",
            components: "=",
        },
        /**
         * @memberof Documa.CSRM.directive.migrationProgress
         * @param {$rootScope.Scope} scope
         * @param {jQuery} elem
         * @param {Object} attr
         */
        link: function (scope, elem, attr) {
            let progressManager = Documa.RuntimeManager.getUIManager().getMigrationManager().getProgressManager();
            let progressView = progressManager.getView();

            progressView.setup(scope, elem, attr);

            //notify parent scope
            scope.$applyAsync(function () {

            });
        }
    };
});


