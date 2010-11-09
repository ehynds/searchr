define(function(){
	var target = $("#breadcrumb"),
		tmplBreadcrumb = $("#tmplBreadcrumb"),
		history = [];
	
	// form submit
	$.subscribe("/form/submit", function( term ){
		breadcrumb.add( term );
	});
	
	// form reset
	$.subscribe("/form/reset", function(){
		breadcrumb.reset();
	});
	
	var breadcrumb = {
		add: function( term ){
			if( !$.trim(term).length ){
				return;
			}
			
			// show target?
			if( target.is(":hidden") ){
				target.slideDown("fast");
			}
			
			var index = $.inArray(term, history);
			
			// add to breadcrumb
			target.append( tmplBreadcrumb.tmpl({ term:term }) );
			
			// if this term already exists in the history somewhere
			// remove everything after it
			if( index > -1 ){
				this._remove( index );
			}
			
			// push new term into the array
			history.push( term );
		},
		reset: function(){
			target.slideUp("fast").empty();
			history = [];
		},
		_remove: function( index ){
			history.splice( index );
			target.find("li:gt(" + index + ")").remove()
		}
	};
});