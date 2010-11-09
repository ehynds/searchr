(function( doc ){
	
	/*
		Design notes
		
		- A lot of the design is overkill for this demo, but would be necessary in larger apps,
		  especially if using a dependency loading system.  Also scales better IMO.
		  
		- Each major piece of functionality is broken up into "modules" using the module
		  pattern, but only those with a public API are namespaced into Searchr.
		 
		what i learned from this: 
			
			- don't throw an event for everything or it'll quickly turn into pubsub soup
			- on the same note, some kind of app controller AND event controller would be beneficial
			- pub/sub is great for decoupling between modules, but is not a way to organize code
			
		TODO:
			- caching
			- organization
	*/
	
	// namespace
	var Searchr = Searchr || {
		
		// cache elements and templates that should be
		// available across all modules
		common: {
			form: $("form"),
			keyword: $("#keyword"),
			tmplNoResults: $("#tmplNoResults"),
			tmplEnterKeyword: $("#tmplEnterKeyword")
		},
		
		// utilities
		utils: {
			// function to throttle ajax requests - by remy sharp
			throttle: function( fn, delay ){
				var timer = null;
				
				return function(){
					var context = this, args = arguments;
					clearTimeout(timer);
					timer = setTimeout(function(){
						fn.apply(context, args);
					}, delay);
				};
			},
			
			// normalize AJAX calls to YQL
			YQL: function( params, callback ){
				params.env = "store://datatables.org/alltableswithkeys";
				return $.getJSON('http://query.yahooapis.com/v1/public/yql?format=json&callback=', params, callback);
			}
		}
	};
	
	// search module
	Searchr.search = (function(){
		
		// import dependencies
		var Utils = Searchr.utils,
			Common = Searchr.common,
			
			apis = {},
			xhrs = [],
			sources = [],
			xhrCounter = 0,
			timer,
			
			// save some references
			keyword = Common.keyword,
			form = Common.form,
			win = $(window),
			target = $("#target"),
			spinner = $("#spinner"),
			tmplResults = $("#tmplResults"),
			tmplNoSources = $("#tmplNoSources"),
			reset = $("#reset"),
			
			// object from which all APIs will extend
			apiTemplate = { select:[], from:'', where:'', and:{}, process: $.noop, countOffset:0 };
		
		function buildQuery( api, term ){
			var ret = '';
			ret += 'select ';
			ret += api.select.join(',');
			ret += ' from ';
			ret += api.from;
			ret += ' where ';
			ret += api.where
			ret += ' = "' + term + '"';
			
			if( apis.hasOwnProperty("and") ){
				$.each(api.and, function( key ){
					ret += ' and ' + key + ' = ' + api.and[key];
				});
			}
			
			return ret;
		}
		
		// deal with results
		$.subscribe("/search/submit", function( term ){
			var totalResults = (xhrCounter = 0);
			
			// prepare target
			target.empty();
			
			// remember this search
			window.location.hash = term;
			
			// reset and bail if there was no term or no sources set
			if( !$.trim(term).length ){
				$.publish("/search/reset");
				return;
			}
			
			// o hai spinner
			spinner.show();
			
			// kill off any existing xhr's
			xhrs = $.map(xhrs, function(r,i){
				r.abort();
				xhrCounter--;
				return null;
			});
			
			// for each API, get the image and send into the API's process handler
			$.each(sources, function( i, source ){
				xhrs.push(Utils.YQL({ q:buildQuery( apis[source], encodeURIComponent(term) )}, function( response ){
					if( !response ){ return; }
					
					// some apis (like flickr) return 1 as a count even though 0
					// really came back.  adjust count with the offset
					var count = parseInt(response.query.count, 10) + apis[source].countOffset;
					totalResults += count;
					xhrCounter++;
					
					// process results as long as something came back
					if( count > 0 ){
						apis[source].process( response );
					}
					
					// if this is the last call and the total results are 0,
					// publish no results
					if( ++i === sources.length && !totalResults ){
						$.publish("/search/noresults");
					}
				}));
			});
		});
		
		// what sucks about a bunch of listeners like this is that
		// there's no concept of flow or structure
		
		// listen for results to come back
		$.subscribe("/search/results", function( results ){
			tmplResults.tmpl( results ).appendTo( target );
		});
		
		// listen for no results
		$.subscribe("/search/noresults", function(){
			target.html( Common.tmplNoResults.tmpl() );
		});

		// listen for no sources
		$.subscribe("/search/nosources", function(){
			target.html( tmplNoSources.tmpl() );
		});
		
		// listen for form reset
		$.subscribe("/search/reset", function(){
			keyword.val('');
			window.location.hash = "";
			target.html( Common.tmplEnterKeyword.tmpl() );
		});
		
		
		// DOM events
		
		// listen for hash change events
		win.bind("hashchange", function(){
			keyword
				.val( window.location.hash.replace('#', '') )
				.trigger("keyup");
		});
		
		// form events
		form.bind("submit", false);
		
		// reset button
		reset.bind("click", function(){
			$.publish("/search/reset");
		});

		// setup ajax events on the keyword
		keyword
			.bind("keyup", Utils.throttle(function( event ){
				if( sources.length ){
					$.publish("/search/submit", [ this.value ]);
				} else {
					$.publish("/search/nosources");
				}
				
				return false;
			}, 250))
			.bind("ajaxComplete", function(xhr){
				if( --xhrCounter <= 0 ){ // TODO: suggestion xhr affects this logic, hence the LTE
					spinner.hide();
				}
			});
			
		return {
			// calling this "init" wouldn't make sense
			// because everything above is actually the init code.
			// start is run once - to start the application
			start: function(){
				var tmplSources = $("#tmplSources");
				
				// build registered apis
				$.each(apis, function( name ){
					tmplSources.tmpl({ name:name }).appendTo("#sources");
					sources.push( name );
				});
				
				win.trigger("hashchange");
			},
			setSources: function( n ){
				sources = n;
			},
			register: function( name, obj ){
				apis[name] = $.extend({}, apiTemplate, obj);
			}
		};
	})();
	
	
	
	// add/remove api checkbox functionality
	(function(){
	
		// import dependencies
		var Utils = Searchr.utils,
			Common = Searchr.common,
			
			form = Common.form,
			sources = $(":checkbox[name=source]");
		
		form.delegate(":checkbox", "click", function(){
			var value = Common.keyword.val(),
				active = form.find(":checkbox:checked").map(function(){
					return this.id;
				}).get();
			
			// set sources
			Searchr.search.setSources( active );
			
			// submit if there's at least one source and a keyword to search against
			if( active.length && value.length ){
				$.publish("/search/submit", [ value ]);
				
			} else if( !active.length ){
				$.publish("/search/nosources");
			}
		});
	
	})();
	
	
	
	// suggestions functionality
	(function(){
	
		// import dependencies
		var Utils = Searchr.utils,
			Common = Searchr.common,
			
			tmplSuggestion = $("#tmplSuggestion"),
			target = $("#suggestions ul"),
			xhr;
		
		function buildQuery( term ){
			return 'select * from search.suggest where query = "' + term + '"';
		}
		
		function noResults(){
			target
				.html( Common.tmplNoResults.tmpl() )
				.addClass("no-suggestions");
		}
		
		// listen for form submission
		$.subscribe("/search/submit", function( term, sources ){
			if( !$.trim(term).length ){
				return;
			}
			
			xhr && xhr.abort();
			
			xhr = Utils.YQL({ q:buildQuery( term ) }, function( response ){
				if( !response ){ return; }
				
				if( parseInt(response.query.count, 10) === 0 ){
					$.publish("/suggest/noresults");
				} else {
					$.publish("/suggest/results", [response, term]);
				}
			});
		});
		
		// listen for no results from the main search and the suggestion search
		$.subscribe("/search/noresults", noResults);
		$.subscribe("/suggest/noresults", noResults);
		
		// listen for results from suggestions
		$.subscribe("/suggest/results", function( response, term ){
			target
				.removeClass("no-suggestions")
				.html(function(){
				
					// create an array of objects for the template
					var objs = $.map(response.query.results.Result, function( item ){
						return { suggestion:item };
					});
					
					// render the template, and include a helper function to highlight the
					// search term within each suggestion.
					return tmplSuggestion.tmpl( objs, {
						highlight:function( val ){
							return val.replace(
								new RegExp(term, 'g'), 
								'<strong>$&</strong>'
							);
						}
					});
				});
		});
		
		// listen for form reset
		$.subscribe("/search/reset", function(){
			target
				.html( Common.tmplEnterKeyword.tmpl() )
				.addClass("no-suggestions");
		});
	})();
	
	// application init logic
	Searchr.init = function(){
		Searchr.search.start();
	};
	
	// expose
	window.Searchr = Searchr;
	
})( $(document) );