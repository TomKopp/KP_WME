Ext.namespace('Documa.ui.layout.strategy');

Documa.require('Documa.util.Logger');

Documa.ui.layout.strategy.Mapping = Ext.extend(Object, (function () {
	var TAG = "Documa.ui.layout.strategy.Mapping";
	var _log = Documa.util.Logger;

	return {

		/**
		 * Contains the mapping information associating each
		 * model element with a code fragment. Each entry
		 * consists of model element name, mapping code, a type
		 * and a scope for elements referencing context
		 * parameters.
		 *
		 * @type {Array.<{element:string, mapping:string, type:string}>}
		 */
		mappings: [
			{
				element: "absolute",
				mapping: "Math.abs",
				type: "function"
			},
			{
				element: "floor",
				mapping: "Math.floor",
				type: "function"
			},
			{
				element: "ceil",
				mapping: "Math.ceil",
				type: "function"
			},
			{
				element: "min",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().min",
				type: "function"
			},
			{
				element: "max",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().max",
				type: "function"
			},
			{
				element: "sum",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().sum",
				type: "function"
			},
			{
				element: "avg",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().avg",
				type: "function"
			},
			{
				element: "viewport-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getViewportWidth()",
				type: "numeric",
				scope: "global"
			},
			{
				element: "viewport-height",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getViewportHeight()",
				type: "numeric",
				scope: "global"
			},
			{
				element: "all-count",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getAllCount()",
				type: "numeric",
				scope: "global"
			},
			{
				element: "all-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getAllWidth()",
				type: "array",
				scope: "global"
			},
			{
				element: "all-min-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getAllMinWidth()",
				type: "array",
				scope: "global"
			},
			{
				element: "all-max-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getAllMaxWidth()",
				type: "array",
				scope: "global"
			},
			{
				element: "all-height",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getAllHeight()",
				type: "array",
				scope: "global"
			},
			{
				element: "all-min-height",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getAllMinHeight()",
				type: "array",
				scope: "global"
			},
			{
				element: "all-max-height",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getAllMaxHeight()",
				type: "array",
				scope: "global"
			},
			{
				element: "group-count",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupCount(group)",
				type: "numeric",
				scope: "group"
			},
			{
				element: "group-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupWidth(group)",
				type: "array",
				scope: "group"
			},
			{
				element: "group-min-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupMinWidth(group)",
				type: "array",
				scope: "group"
			},
			{
				element: "group-max-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupMaxWidth(group)",
				type: "array",
				scope: "group"
			},
			{
				element: "group-height",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupHeight(group)",
				type: "array",
				scope: "group"
			},
			{
				element: "group-min-height",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupMinHeight(group)",
				type: "array",
				scope: "group"
			},
			{
				element: "group-max-height",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupMaxHeight(group)",
				type: "array",
				scope: "group"
			},
			{
				element: "current-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getWidth(index)",
				type: "numeric",
				scope: "individual"
			},
			{
				element: "current-min-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getMinWidth(index)",
				type: "numeric",
				scope: "individual"
			},
			{
				element: "current-height",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getHeight(index)",
				type: "numeric",
				scope: "individual"
			},
			{
				element: "current-min-height",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getMinHeight(index)",
				type: "numeric",
				scope: "individual"
			},
			{
				element: "current-index",
				mapping: "index",
				type: "numeric",
				scope: "individual"
			},
			{
				element: "selection-count",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupCount(selection)",
				type: "numeric",
				scope: "selection"
			},
			{
				element: "selection-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupWidth(selection)",
				type: "array",
				scope: "selection"
			},
			{
				element: "selection-min-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupMinWidth(selection)",
				type: "array",
				scope: "selection"
			},
			{
				element: "selection-max-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupMaxWidth(selection)",
				type: "array",
				scope: "selection"
			},
			{
				element: "selection-height",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupHeight(selection)",
				type: "array",
				scope: "selection"
			},
			{
				element: "selection-min-height",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupMinHeight(selection)",
				type: "array",
				scope: "selection"
			},
			{
				element: "selection-max-height",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getGroupMaxHeight(selection)",
				type: "array",
				scope: "selection"
			},
			{
				element: "set-width",
				mapping: "Documa.RuntimeManager.getUIManager().getLayoutManager().getLayoutContext().getSetWidth(selection, threshold)",
				type: "array",
				scope: "selection"
			}
		],

		/**
		 * Provides the mapping entry for a specific model
		 * element.
		 *
		 * @param elementName
		 *            The name of a model element for which to
		 *            get the mapping (nodeName in XML)
		 * @returns {{element:string, mapping:string, type:string}}
		 */
		getMappingByName: function (elementName) {
			for (var i = 0; i < this.mappings.length; i++) {
				if (this.mappings[i].element == elementName)
					return this.mappings[i];
			}
		},

		/**
		 * Provides the array of mapping entries of a specific
		 * type.
		 *
		 * @param typeName
		 *            The type name for which to get the
		 *            mappings
		 */
		getMappingsByType: function (typeName) {
			var result = new Array();
			for (var i = 0; i < this.mappings.length; i++) {
				if (this.mappings[i].type == typeName)
					result.push(this.mappings[i]);
			}
			return result;
		},

		/**
		 * Provides the array of mapping entries with a specific
		 * scope.
		 *
		 * @param scopeName
		 *            The scope name for which to get the
		 *            mappings
		 */
		getMappingsByScope: function (scopeName) {
			var result = new Array();
			for (var i = 0; i < this.mappings.length; i++) {
				if (this.mappings[i].scope == scopeName)
					result.push(this.mappings[i]);
			}
			return result;
		}
	};
})());