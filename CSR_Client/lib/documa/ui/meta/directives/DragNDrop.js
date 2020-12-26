Ext.namespace("Documa.ui.meta.directives");

Documa.require("Documa.util.Logger");


(function(){
	var log = Documa.util.Logger;
	var TAG = "Documa.ui.meta.directives.DragNDrop";
	/**
	 * drag directive.
	 */
	Documa.CSRM.directive("csrDrag", function($compile){
		return {
			restrict: "A",
			/**
			 * @param {$rootScope.Scope} scope
			 * @param {jQuery} elem
			 * @param {Object} attr
			 */
			link: function(scope, elem, attr){
				var dragFn = elem.attr('csr-drag');
				elem.attr("draggable", true);
				elem.on("dragstart",
					/** @param {jQuery.Event} event */
					function(event){
						try {
							scope.$eval(dragFn, {"$event": event.originalEvent});
						} catch (error) {
							log.error(TAG, error.stack);
						}
					});
			}
		};
	});

	Documa.CSRM.directive("csrDragEnd", function($compile){
		return {
			restrict: "A",
			/**
			 * @param {$rootScope.Scope} scope
			 * @param {jQuery} elem
			 * @param {Object} attr
			 */
			link: function(scope, elem, attr){
				var dragEndFn = elem.attr('csr-drag-end');
				elem.attr("draggable", true);
				elem.on("dragend",
					/** @param {jQuery.Event} event */
					function(event){
						try {
							scope.$eval(dragEndFn, {"$event": event.originalEvent});
						} catch (error) {
							log.error(TAG, error.stack);
						}
					});
			}
		};
	});

	Documa.CSRM.directive("csrDragEnter", function($compile){
		return {
			restrict: "A",
			link: function(scope, elem, attr){
				var dragEnterFn = elem.attr("csr-drag-enter");
				elem.on("dragenter",
					/** @param {jQuery.Event} event */
					function(event){
						try {
							scope.$eval(dragEnterFn, {"$event": event.originalEvent});
						} catch (error) {
							log.error(TAG, error.stack);
						}
					}
				);
			}
		};
	});

	Documa.CSRM.directive("csrDragLeave", function($compile){
		return {
			restrict: "A",
			link: function(scope, elem, attr){
				var dragLeaveFn = elem.attr("csr-drag-leave");
				elem.on("dragleave",
					/** @param {jQuery.Event} event */
					function(event){
						try {
							scope.$eval(dragLeaveFn, {"$event": event.originalEvent});
						} catch (error) {
							log.error(TAG, error.stack);
						}
					}
				);
			}
		};
	});

	Documa.CSRM.directive("csrDragOver", function($compile){
		return {
			restrict: "A",
			link: function(scope, elem, attr){
				var dragOverFn = elem.attr("csr-drag-over");
				elem.on("dragover",
					/** @param {jQuery.Event} event */
					function(event){
						try {
							scope.$eval(dragOverFn, {"$event": event.originalEvent});
						} catch (error) {
							log.error(TAG, error.stack);
						}
					}
				);
			}
		};
	});

	Documa.CSRM.directive("csrDrop", function($compile){
		return {
			restrict: "A",
			/**
			 * @param {$rootScope.Scope} scope
			 * @param {jQuery} elem
			 * @param {Object} attr
			 */
			link: function(scope, elem, attr){
				var dropFn = elem.attr("csr-drop");
				elem.on("dragover",
					/** @param {jQuery.Event} event */
					function(event){
						event.preventDefault();
					});
				elem.on("drop",
					/** @param {jQuery.Event} event */
					function(event){
						try {
							scope.$eval(dropFn, {"$event": event.originalEvent});
						} catch (error) {
							log.error(TAG, error.stack);
						}
					});
			}
		};
	});
}());
