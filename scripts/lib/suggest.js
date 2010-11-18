define(["lib/core", "lib/cache"], function( core, cache ){
	
	var target = $("#suggestions ul"), xhr;
	
	// compile templates
	$("#tmplNoResults").template("tmplNoResults");
	$("#tmplSuggestion").template("tmplSuggestion");
	$("#tmplSuggestionLoading").template("tmplSuggestionLoading");
	$("#tmplSuggestionError").template("tmplSuggestionError");
	
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
			target.html( $.tmpl("tmplSuggestionLoading") );
			
			// found in cache?
			if( $.isArray(cacheData) ){
				self[ !cacheData.length ? '_noResults' : '_results' ]( cacheData );
				
			} else {
				xhr && xhr.readyState < 4 && xhr.abort();
				
				xhr = core.YQL(
					{ q:this._buildQuery() },
					function( response ){
						
						if( !response ){
							self._onError();
							return;
						}
						
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
					},
					function(){
						self._onError();
					}
				);
			}
		},
		reset: function(){
			target
				.html( $.tmpl(core.tmplEnterKeyword) )
				.addClass("no-suggestions");
		},
		_onError: function(){
			target.html(
				$.tmpl("tmplSuggestionError")
			);
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
			return 'select * from search.suggest where query = "' + this.term + '"';
		}
	};
});