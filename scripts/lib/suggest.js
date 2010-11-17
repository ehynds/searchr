define(["lib/core", "lib/cache"], function( core, cache ){
	
	var target = $("#suggestions ul"), xhr;
	
	// compile templates
	$("#tmplNoResults").template("tmplNoResults");
	$("#tmplLoadingSuggestions").template("tmplLoadingSuggestions");
	$("#tmplSuggestion").template("tmplSuggestion");
	
	// listen for a search start event to kick this thing off
	$.subscribe("/form/submit", function( term ){
		term = $.trim(term);
		suggest[ term.length > 0 ? 'start' : 'reset' ]( term );
	});
	
	// listen for form reset
	$.subscribe("/form/reset", function(){
		suggest.reset();
	});
	
	var suggest = {
		start: function( term ){
			var self = this, cacheData = cache.get( term, "suggest" );
			this.term = term;
			
			// insert loading message
			target.html( $.tmpl("tmplLoadingSuggestions") );
			
			// found in cache?
			if( $.isArray(cacheData) ){
				self[ !cacheData.length ? '_noResults' : '_results' ]( cacheData );
				
			} else {
				xhr && xhr.readyState < 4 && xhr.abort();
				
				xhr = core.YQL({ q:this._buildQuery() }, function( response ){
					if( !response ){ return; }
					var results = '';
					
					// were any results found?
					if( parseInt(response.query.count, 10) > 0 ){
						results = response.query.results.Result;
						self._results( results );
						
					// no suggestions :(
					} else {
						self._noResults();
					}
					
					// store in cache
					cache.store( term, "suggest", results );
				});
			}
		},
		reset: function(){
			target
				.html( core.tmplEnterKeyword.tmpl() )
				.addClass("no-suggestions");
		},
		_results: function( results ){
			var term = this.term;
			
			target
				.removeClass("no-suggestions")
				.html(function(){
				
					// create an array of objects for the template
					var objs = $.map(results, function( item ){
						return { suggestion:item };
					});
					
					// render the template, and include a helper function to highlight the
					// search term within each suggestion.
					return $.tmpl("tmplSuggestion", objs, {
						highlight:function( val ){
							return val.replace(
								new RegExp(term, 'g'), 
								'<strong>$&</strong>'
							);
						}
					});
				});
		},
		_noResults: function(){
			target.html(
				$.tmpl("tmplNoResults", { term:this.term })
			).addClass("no-suggestions");
		},
		_buildQuery: function(){
			return 'select * from search.suggest(0) where query = "' + this.term + '"';
		}
	};
});