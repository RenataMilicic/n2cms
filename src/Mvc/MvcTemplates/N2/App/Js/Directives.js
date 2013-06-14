﻿(function (module) {
	module.directive("contextMenuTrigger", function () {
		return {
			restrict: "A",
			link: function compile(scope, element, attrs) {
				element.bind("contextmenu", function (e) {
					var clickedElements = $(e.target).closest(".item").find(".dropdown-toggle").trigger("click").length;
					if (clickedElements)
						e.preventDefault();
				});
			}
		}
	});

	module.directive("evaluateHref", function ($interpolate) {
		return {
			restrict: "A",
			link: function compile(scope, element, attrs) {
				scope.$watch(attrs.evaluateHref, function (expr) {
					element.attr("href", expr && $interpolate(expr)(scope));
				});
			}
		}
	});

	module.directive("evaluateTitle", function ($interpolate) {
		return {
			restrict: "A",
			link: function compile(scope, element, attrs) {
				scope.$watch(attrs.evaluateTitle, function (expr) {
					element.attr("title", expr && $interpolate(expr)(scope));
				});
			}
		}
	});

	module.directive("evaluateInnerHtml", function ($interpolate) {
		return {
			restrict: "A",
			link: function compile(scope, element, attrs) {
				scope.$watch(attrs.evaluateInnerHtml, function (expr) {
					console.log("watching", expr, $interpolate(expr)(scope), scope.Context.CurrentItem.Title);
					element.html(expr && $interpolate(expr)(scope));
				});
			}
		}
	});

	module.directive("pageActionLink", function ($interpolate) {
		return {
			restrict: "E",
			replace: true,
			scope: true,
			templateUrl: 'App/Partials/PageActionLink.html',
			link: function compile(scope, element, attrs) {
				scope.$watch(attrs.node, function (node) {
					scope.node = node;
					if (node.Current && !node.Current.Target)
						node.Current.Target = "preview";
					if (node.Current && !node.Current.Url && node.Current.PreviewUrl)
						node.Current.Url = node.Current.PreviewUrl;
				});
				scope.evaluateExpression = function (expr) {
					return expr && $interpolate(expr)(scope);
				};
				scope.evalExpression = function (expr) {
					console.log("eval", expr, scope.Context.CurrentItem && scope.Context.CurrentItem.PreviewUrl);
					expr && scope.$eval(expr);
				};
			}
		}
	});

	module.directive("backgroundImage", function () {
		return {
			restrict: "A",
			link: function compile(scope, element, attrs) {
				scope.$watch(attrs.backgroundImage, function (backgroundImage) {
					if (backgroundImage) {
						var style = element.attr("style");
						if (style)
							style += ";";
						else
							style = "";
						style += "background-image:url(" + backgroundImage + ")";
						element.attr("style", style);
					}
				});
			}
		}
	});

	module.directive("load", function($parse){
		return function (scope, element, attr) {
			var fn = $parse(attr.load);
			element.bind("load", function (e) {
				scope.$apply(function () {
					fn(scope, { $event: e });
				});
			});
		};
	});

	module.directive("keyup", function ($parse) {
		return function (scope, element, attr) {
			var fn = $parse(attr.keyup);
			element.bind("keyup", function (e) {
				scope.$apply(function () {
					fn(scope, { $event: e });
				});
			});
		};
	});

	module.directive("esc", function ($parse) {
		return function (scope, element, attr) {
			var fn = $parse(attr.keyup);
			element.bind("keyup", function (e) {
				if (e.keyCode == 27) {
					scope.$apply(function () {
						fn(scope, { $event: e });
					});
				}
			});
		};
	});

	module.directive("sortable", function () {

		var ctx = {
		};

		return {
			restrict: "A",
			link: function compile(scope, element, attrs) {
				var sort = {
					start: function (e, args) {
						var $from = $(args.item[0]).parent().closest("li");
						ctx = {
							operation: "sort",
							indexes: {
								from: args.item.index()
							},
							scopes: {
								from: $from.length && angular.element($from).scope()
							},
							paths: {
								from: $from.attr("sortable-path") || null
							}
						};
					},
					remove: function (e, args) {
					},
					update: function (e, args) {
					},
					receive: function (e, args) {
						ctx.operation = "move";
					},
					stop: function (e, args) {
						var $selected = $(args.item[0]);
						var $to = $selected.parent().closest("li");

						ctx.paths.selected = $selected.attr("sortable-path") || null;
						ctx.paths.to = $to.attr("sortable-path") || null;
						ctx.paths.before = $selected.next().attr("sortable-path") || null;

						ctx.scopes.selected = $selected.length && angular.element($selected).scope();
						ctx.scopes.to = $to.length && angular.element($to).scope();
						
						ctx.indexes.to = args.item.index();

						ctx.scopes.from.node.Children.splice(ctx.indexes.from, 1);

						var options = scope.$eval(attrs.sortable)

						if (ctx.operation == "move") {
							options.move && options.move(ctx);
						} else {
							options.sort && options.sort(ctx);
						}
						ctx.scopes.from.$digest();
						ctx.scopes.to.$digest();
						ctx = {};
					}
				};

				setTimeout(function () {
					element.sortable({
						connectWith: '.targettable',
						placeholder: 'sortable-placeholder',
						handle: '.handle',
						receive: sort.receive,
						remove: sort.remove,
						update: sort.update,
						start: sort.start,
						stop: sort.stop
					});
				}, 100);
			}
		}
	});

	module.directive('compile', function ($compile) {
		return function (scope, element, attrs) {
			scope.$watch(
				function (scope) {
					// watch the 'compile' expression for changes
					return scope.$eval(attrs.compile);
				},
				function (value) {
					if (value === null)
						return;

					// when the 'compile' expression changes assign it into the current DOM
					element.html(value);

					// compile the new DOM and link it to the current scope.
					// NOTE: we only compile .childNodes so that we don't get into infinite loop compiling ourselves
					$compile(element.contents())(scope);
				}
			);
		};
	});

	module.filter('pretty', function () {
		function syntaxHighlight(json) {
			if (typeof json != 'string') {
				json = angular.toJson(json, true);
			}
			json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
				var cls = 'number';
				if (/^"/.test(match)) {
					if (/:$/.test(match)) {
						cls = 'key';
					} else {
						cls = 'string';
					}
				} else if (/true|false/.test(match)) {
					cls = 'boolean';
				} else if (/null/.test(match)) {
					cls = 'null';
				}
				return '<span class="' + cls + '">' + match + '</span>';
			});
		}
		return function (obj) {
			return "<style>\
span.key {color:blue}\
span.number {color:green}\
span.string {color:red}\
span.boolean {color:green}\
span.null {color:silver}\
</style><pre>" + syntaxHighlight(obj) + "</pre>";
		};
	});

})(angular.module('n2.directives', []));