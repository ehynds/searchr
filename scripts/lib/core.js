define({
	form: $("form"),
	keyword: $("#keyword"),
	tmplEnterKeyword: $("#tmplEnterKeyword").template(),
	appid: 'UsC1thvV34GAi_Qe2r4ooePhutfIibRzZ6We9MFvbzNknJ1td.qS2Ayd3NNdf9B3HbF4mXALL6Unlqy_6LItTHW2fZ8qnIw-',
	
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
	YQL: function( params, success, error, complete ){
		params.env = "store://datatables.org/alltableswithkeys";

		return $.ajax({
			url: 'http://query.yahooapis.com/v1/public/yql?format=json&callback=',
			data: params,
			success: success,
			error: error,
			complete: complete || $.noop
		});
	}
});
