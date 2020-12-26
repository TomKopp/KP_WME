Ext.namespace('Documa.ui.migration');

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

/**
 * This class is responsible for the list of migration options.
 * @class Documa.ui.migration.MigrationOptionsView
 *
 * @author Julian Catoni
 */
Documa.ui.migration.MigrationOptionsView = Ext.extend(Object, (function () {
    const TAG = 'Documa.ui.migration.MigrationOptionsView';
    const _log = Documa.util.Logger;

    /**
     * @type {Documa.ui.migration.MigrationOptionsManager}
     * @memberOf Documa.ui.migration.MigrationOptionsView
     * @private
     */
    let _optionsManager = null;

    return {
        /**
         * Constructor for MigrationOptionsView
         * @constructs Documa.ui.migration.MigrationOptionsView
         * @memberOf Documa.ui.migration.MigrationOptionsView
         * @param {Documa.ui.migration.MigrationOptionsManager} optionsManager
         */
        constructor: function (optionsManager) {
            _log.debug(TAG, "... constructing.");
            _optionsManager = optionsManager;
            this._scope = null;
        },

        /**
         * Sets the migration options which should be shown and notifies the scope.
         * @memberOf Documa.ui.migration.MigrationOptionsView
         * @param {Array.<Documa.distribution.migration.options.MigrationOption>} options Array containing migration options.
         */
        setMigrationOptions: function (options){
            // First apply an empty array in order to reset the complete migration option list
            this._scope.options = [];
            this._scope.$apply();
            this._scope.options = options;
            this._scope.$apply();
        },

        /**
         * Setup method which initializes some fields and sets the correct height for the list of migration options.
         * @memberOf Documa.ui.migration.MigrationOptionsView
         * @param scope AngularJS scope object of the migrationOptionsList template
         */
        setup: function (scope) {
            this._scope = scope;
            $("#migration-options-body").height($(window).height()*0.7);
        }

    };
})());

/**
 * Definition of migration migration options list component.
 */
Documa.CSRM.directive("migrationOptionsList", function ($compile) {
    return {
        restrict: "E",
        templateUrl: "lib/documa/ui/templates/mui_migrationoptionslist.html",
        scope: {
            controller: "=",
            components: "="
        },

        /**
         *
         * @memberOf Documa.CSRM.directive.migrationOptionsList
         * @param scope
         */
        link: function (scope/*, elem, attr*/) {
            let optionsManager = Documa.RuntimeManager.getUIManager().getMigrationManager().getOptionsManager();
            let optionsView = optionsManager.getView();

            optionsView.setup(scope);

            /**
             * Selects a migration option, is triggered via click on select migration button.
             * @param {String} id ID of the migration option, which was selected
             */
            scope.selectMigrationOption = function(id) {
                let option = optionsManager.getMigrationOption(id);
                optionsManager.selectOption(id,option);
            };


            /**
             * Expands or collapses a migration option.
             * @param {String} id ID of the migration option, which should be expanded or collapsed
             */
            scope.expandOrCollapseMigrationOption = function(id) {
                let option = $('.migration-option[data-option-id="' + id + '"]');
                let mainContainer = option.find(".migration-main-container");
                if (option.hasClass("collapsed")){
                    mainContainer.slideToggle('150',function() {
                        option.removeClass('collapsed');
                        let scrollPos = $("#migration-options-body").scrollTop() + option.position().top;
                        $("#migration-options-body").animate({scrollTop: scrollPos}, 200);
                    });
                    option.find('.migration-preview-container > .migration-preview').slideUp('150');
                } else {
                    mainContainer.slideUp('150', function () {
                        option.addClass('collapsed');
                    });
                    option.find('.migration-preview-container > .migration-preview').slideDown({
                        duration: '150',
                        step: function () {
                            if ($(this).css('display') == 'block') {
                                $(this).css('display', 'flex');
                            }
                        }
                    });
                }
            };
        }
    };
});
