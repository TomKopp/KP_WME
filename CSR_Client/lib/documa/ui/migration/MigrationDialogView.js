Ext.namespace("Documa.ui.migration");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");
Documa.require("Documa.components.ComponentInterface");

/**
 * Dialog view for migration process.
 * @class Documa.ui.migration.MigrationDialogView
 */
Documa.ui.migration.MigrationDialogView = Ext.extend(Object, function () {
    const TAG = "Documa.ui.migration.MigrationDialogView";
    const _log = Documa.util.Logger;

    ///////////////////////////
    // private class members //
    ///////////////////////////

    /**
     * Carousel.
     * @type {jQuery}
     * @private
     */
    let _$carousel = null;

    /**
     * Items of carousel.
     * @type {jQuery}
     * @private
     */
    let _$carouselItems = null;

    /**
     * Returns interface descriptors from local and remote components.
     * @returns {Map.<String, Documa.components.ComponentInterface>}
     * @private
     */
    function getComponentInterfaces() {
        let results = new Map();
        let appcontext = Documa.RuntimeManager.getUIManager().getMigrationManager().getApplicationContext();

        // get local component descriptors
        let containers = Documa.RuntimeManager.getComponentManager().getContainers();
        for (let container of containers) {
            if (!results.has(container.getComponentID())) {
                results.set(container.getComponentID(), new Documa.components.ComponentInterface(container.getDescriptor()));
            }
        }

        // get remote component descriptors
        let remotes = appcontext.getDistributionManager().getRemoteComponentDescriptors();
        for (let cid in remotes) {
            if (!remotes.hasOwnProperty(cid))
                continue;
            if (!results.has(cid)) {
                results.set(cid, new Documa.components.ComponentInterface(remotes[cid]));
            }
        }
        return results;
    }

    ////////////////////
    // public methods //
    ////////////////////
    return {
        /**
         * Ctor.
         * @constructs Documa.ui.migration.MigrationDialogView
         */
        constructor: function () {
            _log.debug(TAG, "... constructing.");

            // param for directive
            this._scope = null;
            this._elem = null;
            this._attr = null;

            /**
             *  Visibility of dialog.
             * @type {boolean}
             * @private
             */
            this._isVisible = false;

            /**
             * JQuery object of modal.
             * @type {jQuery}
             * @private
             */
            this._$modal = null;
        },

        /**
         * Initiate dialog.
         * @memberOf Documa.ui.migration.MigrationDialogView#
         * @param {$rootScope.Scope} scope
         * @param {jQuery} elem
         * @param {Object} attr
         */
        setup: function (scope, elem, attr) {
            _log.debug(TAG, "... setup object.");

            // param from directive
            this._scope = scope;
            this._elem = elem;
            this._attr = attr;

            // get modal as jQuery object
            this._$modal = $(elem).find('.modal');

            /**
             * Mapping between component id and component interface descriptor.
             * @type {Map.<String, Documa.components.ComponentInterface>}
             */
            this._scope.components = new Map();

            // set carousel settings and get as jQuery object
            _$carousel = $('#migrationCarousel').carousel({
                interval: false,
                pause: true,
            });

            // get items of carousel as jQuery objects
            _$carouselItems = $('#' + _$carousel.attr('id') + ' .carousel-inner > .item');
        },

        /**
         * Renders migration dialog component and set carousel to first item.
         * @memberOf Documa.ui.migration.MigrationDialogView#
         * @private
         */
        _show: function () {
            _log.debug(TAG, "... show migration dialog.");

            if (!this._isVisible) {
                let self = this;

                // loading currently available component descriptors
                this._scope.$apply(function () {
                    /** @type {Map.<String, Documa.components.ComponentInterface>} */
                    self._scope.components = getComponentInterfaces.call(self);
                    _log.debug(TAG, "Size of component descriptors: " + self._scope.components.size);
                });

                // set visibility
                this._isVisible = true;

                // show modal
                this._$modal.modal("show");
            }
        },

        /**
         * Hides migration dialog and reset carousel.
         * @memberOf Documa.ui.migration.MigrationDialogView#
         */
        hide: function () {
            _log.debug(TAG, "... hide migration dialog.");

            //reset carousel
            _$carousel.carousel(0);

            // visibility
            this._isVisible = false;

            //hide modal
            this._$modal.modal("hide");
        },

        /**
         * Go to next item of carousel.
         * @memberOf Documa.ui.migration.MigrationDialogView#
         */
        showMigrationProgress: function () {
            // Checks if the dialog is visible and the carousel position is not at the end
            _log.debug(TAG, "... go to next item(view) of carousel.");

            this._show();
            // _$carousel.carousel(_carouselPosition + 1);
            _$carousel.carousel(1);
        },

        /**
         * Go to previous item of carousel.
         * @memberOf Documa.ui.migration.MigrationDialogView#
         */
        showMigrationOptions: function () {
            // checks if the dialog is visible and the carousel position is not at the beginning
            _log.debug(TAG, "... go to previous item(view) of carousel.");

            this._show();
            // _$carousel.carousel(_carouselPosition - 1);
            _$carousel.carousel(0);
        },

        /**
         * Check visiblity.
         * @memberOf Documa.ui.migration.MigrationDialogView#
         * @returns {boolean}
         */
        isVisible: function () {
            return this._isVisible;
        },
    };
}());

/**
 * Definition of migration dialog component.
 */
Documa.CSRM.directive("migrationDialog", function ($compile) {
    return {
        restrict: "E",
        templateUrl: "lib/documa/ui/templates/mui_migrationdialog.html",
        scope: {
            controller: "="
        },

        /**
         * @memberof Documa.CSRM.directive.migrationDialog
         * @param {$rootScope.Scope} scope
         * @param {jQuery} elem
         * @param {Object} attr
         */
        link: function (scope, elem, attr) {
            let migrationManager = Documa.RuntimeManager.getUIManager().getMigrationManager();
            let dialog = migrationManager.getView();

            dialog.setup(scope, elem, attr);
            migrationManager.setup();
            //notify parent scope
            scope.$applyAsync(function () {
                scope.controller = dialog;
            });
        }
    };
});
