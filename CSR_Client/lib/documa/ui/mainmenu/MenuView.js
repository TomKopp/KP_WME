Ext.namespace('Documa.ui.mainmenu');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.TestUtil');
Documa.require('Documa.ui.mainmenu.MenuManager');
Documa.require('Documa.ui.UIManager');
Documa.require('Documa.ui.views.capview.CapView');

/**
 * View containing the menu elements.
 * @class
 */
Documa.ui.mainmenu.MenuView = Ext.extend(Object, (function () {
    var TAG = 'Documa.ui.mainmenu.MenuView';
    var _log = Documa.util.Logger;

    /** @type {Documa.ui.mainmenu.MenuManager} */
    var _menuManager = null;
    var _tb = null;


    /**
     * @type {Documa.ui.UIManager}
     * @private
     */
    var _uiManager = null;

    var onItemClick = function (item) {
        alert('Menu Item clicked');
    };

    /**
     * @returns {Documa.ui.UIManager}
     */
    function getUIManager() {
        if (_uiManager === null) {
            _uiManager = Documa.RuntimeManager.getUIManager();
        }
        return _uiManager;
    }

    /**
     * function to return the icon of the current logged in user
     * @returns {String}
     */
    var getCurrentUserIcon = function () {
        var currentUserContext = Documa.RuntimeManager.getAuthenticationManager().getCurrentUserContext();
        return '<img src="' + currentUserContext.getUserIcon() +
            '" height="40" alt="Picture of ' + currentUserContext.getUserName() + '" />';
    };

    _tb = new Ext.Toolbar({
        id: 'mainMenuToolBar',
        baseCls: 'appMenuToolBar',
        height: 50,
        items: [
            {
                xtype: 'textfield',
                id: 'tb_search',
                enableKeyEvents: true,
                emptyText: 'Search...',
                fieldLabel: 'Search',
                hideLabel: true,
                height: 30,
                margin: '0 0 0 5',
                listeners: {
                    keyup: {
                        fn: function (tfield, e) {
                            if (e.getKey() == e.ESC) {
                                //hide the SearchPanel when ESC is pressed
                                Ext.getCmp("sp").hide();
                            }
                            else {
                                //if another key is pressed set SearchPanel visible and start SearchQuery
                                if (tfield.getValue().length === 0) return;
                                if (!this.task) {
                                    //the function is only executed if for 500ms no other key is pressed
                                    this.task = new Ext.util.DelayedTask(function () {
                                        var uiman = getUIManager();
                                        uiman.showMetaUI();

                                        var sp = _menuManager.getSearchResultView();
                                        if (!sp.isVisible()) {
                                            sp.show();
                                        }
                                        var query = tfield.getValue();
                                        var isUi = Ext.getCmp('sp_uiCb').getValue();
                                        var maxComps = Ext.getCmp('sp_slider').getValue();
                                        _menuManager.doSearch(query, isUi, maxComps);
                                    });
                                }
                                //Delay Time for KeyPress
                                this.task.delay(500);
                            }
                        }
                    }
                }
            },
            {
                xtype: 'button',
                id: 'tb_searchSubmit',
                text: 'Search',
                height: 50,
                width: 50,
                overCls: 'tb_btn-hover',
                margin: '0 0 0 5',
                listeners: {
                    click: function () {
                        var uiman = getUIManager();
                        uiman.showMetaUI();
                        var sp = _menuManager.getSearchResultView();
                        if (!sp.isVisible())
                            sp.show();
                        var query = Ext.getCmp('tb_search').getValue();
                        var isUi = Ext.getCmp('sp_uiCb').getValue();
                        var maxComps = Ext.getCmp('sp_slider').getValue();
                        _menuManager.doSearch(query, isUi, maxComps);
                    }
                }
            },
            {
                xtype: 'tbspacer',
                width: 50
            },
            {
                xtype: 'button',
                id: 'tb_messageBtn',
                text: 'Messages',
                height: 50,
                overCls: 'tb_btn-hover',
                handler: function () {
                    //getUIManager().getMessagePanelController().showMessagePanelByUser("85226fc0-4d6d-45e1-830c-f14480fa31a6");
                    getUIManager().getSidebarManager().toggle();
                }
            },
            {
                xtype: 'tbtext',
                text: 'no application loaded',
                height: 30,
                style: {
                    'font-weight': 'bold',
                    'text-align': 'center',
                    'line-height': '28px'
                }
            },
            {
                xtype: 'button',
                id: 'tb_viewBtn',
                style: {
                    display: 'none'
                },
                text: 'View',
                height: 50,
                overCls: 'tb_btn-hover',
                menu: {
                    xtype: 'menu',
                    items: [
                        {
                            text: 'CapView Configuration',
                            listeners: {
                                click: function () {
                                    if (Documa.RuntimeManager.getUIManager().getActiveView() instanceof Documa.ui.views.capview.CapView) {
                                        getUIManager().getCVConfigManager().toggle();
                                    }

                                }
                            }
                        },
                        {
                            xtype: 'menuseparator'
                        },
                        {
                            text: 'Distribution View',
                            listeners: {
                                click: function () {
                                    var uiman = getUIManager();
                                    var mui_controller = uiman.getMetaUIController();
                                    uiman.setCenterStageView(mui_controller.getMetaUIView().getContainer());
                                }
                            }
                        },
                        {
                            text: 'Live View',
                            listeners: {
                                click: function () {
                                    _menuManager.changeView("liveView");
                                }
                            }
                        },
                        {
                            text: 'End User View',
                            //id: 'eu_View',
                            listeners: {
                                click: function () {
                                    _menuManager.changeView("capView");
                                }
                            }
                        },
                        {
                            text: 'Professional View',
                            //id: 'prof_View',
                            listeners: {
                                click: function () {
                                    _menuManager.changeView("profView");
                                }
                            }
                        },
                        {
                            text: 'MigrationView',
                            listeners: {
                                click: function () {
                                    //
                                    // getting communication manager to send request
                                    // command to server-side

                                }
                            }
                        },

                        {
                            text: 'History View',
                            //id: 'hist_View',
                            listeners: {
                                click: function () {
                                    _menuManager.changeView("histView");
                                }
                            }
                        },
                    ]
                }
            },
            {
                xtype: 'button',
                id: 'tb_collaborationMenu',
                text: 'Collaboration',
                height: 50,
                overCls: 'tb_btn-hover',
                menu: {
                    xtype: 'menu',
                    items: [
                        {
                            text: 'View Access Rights',
                            handler: function () {
                                // getUIManager().getSharePanelController().showSharePanel();
                            }
                        },
                        {
                            text: 'Share',
                            handler: function () {
                                // var sharePanelController = getUIManager().getSharePanelController();
                                // sharePanelController.showShareTripleView();
                            }
                        }
                    ]
                }
            },
            {
                xtype: 'button',
                id: 'tb_mainMenu',
                text: 'Main Menu',
                height: 50,
                overCls: 'tb_btn-hover',
                menu: {
                    xtype: 'menu',
                    items: [
                        {
                            text: 'New Application',
                            handler: function () {
                                _menuManager.startNewApp();
                            }
                        },
                        {
                            text: 'Load Application',
                            handler: onItemClick
                        },
                        {
                            xtype: 'menuseparator'
                        },
                        {
                            text: 'Save Application',
                            style: {
                                display: 'none'
                            },
                            id: 'menu_item_save_app',
                            handler: function () {
                                _menuManager.saveApplication();
                            }
                        },
                        {
                            text: 'Remove Application',
                            style: {
                                display: 'none'
                            },
                            id: 'menu_item_remove_app',
                            handler: onItemClick
                        },
                        {
                            xtype: 'menuseparator'
                        },
                        {
                            text: 'Import Mashup Composition Model',
                            handler: onItemClick
                        },
                        {
                            text: 'Export  Mashup Composition Model',
                            handler: onItemClick
                        },
                        {
                            xtype: 'menuseparator'
                        },
                        {
                            text: 'Logout',
                            handler: onItemClick
                        }
                    ]
                }
            },
            {
                xtype: 'button',
                id: 'tb_developmentBtn',
                style: {
                    display: 'none'
                },
                text: 'Dev Ops',
                overCls: 'tb_btn-hover',
                height: 50,
                menu: {
                    xtype: 'menu',
                    items: [{
                        text: "Trigger migration options",
                        handler: function () {
                            // triggers a "batterylow" event
                            Documa.util.TestUtil.testMigrationOptions();
                        }
                    }]
                }
            },
            {
                xtype: 'tbtext',
                id: 'tb_userNameText',
                html: "Logged in as:<br/><b>Anonymus</b>"
            },
            {
                xtype: 'tbtext',
                id: 'tb_userThumb',
                html: ''
            },
            {
                xtype: 'button',
                id: 'tb_LogoutBtn',
                text: 'Logout',
                height: 50,
                overCls: 'tb_btn-hover',
                handler: function (button) {
                    Documa.RuntimeManager.logout();
                }
            }]
    });

    ////////////////////
    // public methods //
    ////////////////////
    return {
        /**
         * Ctor.
         * @constructs
         * @param {Documa.ui.mainmenu.MenuManager} controller
         */
        constructor: function (controller) {
            _menuManager = controller;
            _uiManager = Documa.RuntimeManager.getUIManager();
        },

        /**
         * Presents menu items after an application context was created successfully.
         */
        showAppItems: function () {
            $("#tb_viewBtn").show();
            $("#tb_developmentBtn").show();
            $("#menu_item_save_app").show();
            $("#menu_item_remove_app").show();
        },

        /**
         * Renders the toolbar to a specific panel (e.g., appMenuPanel)
         * @param appMenuPanel
         */
        render: function (appMenuPanel) {
            if (_tb !== undefined || _tb !== null) appMenuPanel.add(_tb);
            appMenuPanel.doLayout();
        },

        close: function () {
            _tb.close();
        },

        // updates the displayed user name
        updateUserName: function (userid, username) {
            Ext.getCmp("tb_userNameText").update('Logged in as:<br/><b>' + username + '</b>');
            Ext.getCmp("tb_userThumb").update(getCurrentUserIcon());
        },

        setFocusOnSearchField: function () {
            return Ext.getCmp("tb_search").focus();
        }
    };
})());
