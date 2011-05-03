define(["lib/core", "lib/cache", "lib/apis"], function( core, cache, apis ){
	var xhrs = [],
		sources = apis.get(),
		container = $("#results"),
		target = $("#target"),
		header = $("#resultsHeader"),
		phNumResults = header.find("span"), // "ph" stands for "place holder"
		phTerm = header.find("em"),
		spinner = $("#spinner"),
		enabledSources = [];
	
	// compile templates
	$("#tmplResults").template("tmplResults");
	$("#tmplNoSources").template("tmplNoSources");
	
	// setup listeners to dispatch calls to the search object.
	$.subscribe("/form/submit", function( term ){
		search.start( term );
	});
	
	$.subscribe("/form/reset", function(){
		search.reset();
	});
	
	$.subscribe("/form/toggleSource", function( source, checked, init ){
		search.toggleSources.apply( search, arguments );
	});
	
	// search object
	var search = {
		totalResults: 0,
		counter: 0,
		start: function( term ){
			var self = this;
			
			// grab term out of the keyword field if it wasn't passed in (toggling a source)
			term = term || core.keyword.val();
			
			// short circuit if no term
			if( !$.trim(term).length ){
				this.reset();
				return;
			}
			
			// prepare container as long as there's a term.  this ensures
			// that the height will always be tall enough for the suggestion
			// sidebar, even if no results are found.
			container.animate({ minHeight: "250px" });
			
			// short circut if no sources
			if( !enabledSources.length ){
				target.html( $.tmpl("tmplNoSources") );
				phNumResults.text(0);
				return;
			}
			
			// set counters
			this.counter = 0;
			this.totalResults = 0;
			
			// prepare target
			target.empty();
			
			// remember this search
			window.location.hash = term;
			
			// kill off any open xhr requests
			this._killXHRs();
			
			// for each API, get the image and send into the API's process handler
			$.each(sources, function( name, source ){
				var cacheData = cache.get( term, name );
				
				// process this source?
				if( $.inArray(name, enabledSources) === -1 ){
					return;
				}
				
				// found in cache?
				if( $.isArray(cacheData) ){
					self.results( cacheData );
					self.totalResults += cacheData.length; 
					self._onComplete( term );
					
				// if not in cache, do yql
				} else {
					var query = self._buildQuery( source, term );
					
					// o hai, spinner
					spinner.show();
					
					xhrs.push(
						core.YQL(
							{ q:query },
							function( response ){
								if( !response ){
									self._onError();
									return;
								}
								
								var results = [], count, totalResults;
								
								// some apis (like flickr) return 1 as a count even though 0
								// really came back.  adjust count with the offset
								count = parseInt(response.query.count, 10) + source.responseCountOffset( response );
								totalResults = self.totalResults += count;
								
								// process results as long as something came back
								if( count > 0 ){
									results = source.process( response );
								}
								
								// store in cache
								cache.store( term, name, results );
								
								self.results( results );
							},
							function(){
								self._onError();
							},
							function(){
								self._onComplete( term );
							}
						)
					);
				} // end if in cache
			});
		},
		results: function( results ){
			$.tmpl("tmplResults", results ).appendTo( target );
		},
		reset: function(){
			this._killXHRs();
			core.keyword.val("");
			window.location.hash = "";
			target.html( $.tmpl(core.tmplEnterKeyword) );
			container.animate({ minHeight: "100px" });
			header.slideUp();
			spinner.hide();
		},
		toggleSources: function( source, checked, init ){
			var index = $.inArray( source, enabledSources );
			
			if( index === -1 && checked ){
				enabledSources.push( source );
			} else if( index > -1 ) {
				enabledSources.splice( $.inArray(source, enabledSources), 1);
			}
			
			// run the search if a source was toggled after init
			// TODO: cache the keyword so it doesn't need to be referred to each time
			!init && this.start();
		},
		_onError: function(){
			// TODO: some kind of error handling.  Right now if the requests fail
			// it'll act as if 0 results came back, which is probably fine for now.
		},
		_onComplete: function( term ){
			// once ALL are done
			if( ++this.counter === enabledSources.length ){
				spinner.hide();
			}
			
			// show header
			header.is(":hidden") && header.slideDown();
			
			// update placeholders
			phTerm.text( term );
			phNumResults.text( this.totalResults );
		},
		_killXHRs: function(){
			xhrs = $.map(xhrs, function(r,i){
				r.readyState < 4 && r.abort();
				return null;
			});
		},
		_buildQuery: function( source, term ){
			console.log( source )
			var ret = '';
			ret += 'select ';
			ret += source.select.join(',');
			ret += ' from ';
			ret += source.from + '(0,30)';
			ret += ' where ';
			ret += source.where;
			ret += ' = "' + term + '"';
			
			if( source.hasOwnProperty("and") ){
				$.each(source.and, function( key ){
					console.log(key)
					ret += ' and ' + key + ' = "' + source.and[key] + '"';
				});
			}
			
			return ret;
		}
	};
});
