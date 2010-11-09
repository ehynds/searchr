define({
	form: $("form"),
	keyword: $("#keyword"),
	tmplEnterKeyword: $("#tmplEnterKeyword"),
	
	// throttles ajax requests.  thx to remy sharp <3
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
});