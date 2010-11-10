// this file acts as a controller.  it loads in all dependencies
// and decides when to publish events.  this is the only file that
// publishes; all other modules listen.

require(["lib/core", "lib/apis", "lib/search", "lib/suggest", "lib/breadcrumb", "lib/modal"], function(core, apis, search){
	
	// register the yahoo api
	apis.register("yahoo", {
		select: ['thumbnail_url', 'url', 'title'],
		from: 'search.images',
		where: 'query',
		process: function( response ){
			var results = response.query.results.result;
			
			// if 2+ results come back it's an array, otherwise an object.
			// normalize it into an array
			return +response.query.count === 1
				? [ results ]
				: results;
		}
	});

	// register flickr's api
	apis.register("flickr", {
		select: ['id', 'title', 'farm', 'server', 'secret'],
		from: 'flickr.photos.search',
		where: 'text',
		process: function( response ){
			var ret = [];
			if( +response.query.count > 0  ){
				$.each(response.query.results.photo, function(i, obj){
					var url = "http://farm"+obj.farm+".static.flickr.com/"+obj.server+"/"+obj.id+"_"+obj.secret;
					
					ret[i] = {
						thumbnail_url: url + "_t.jpg",
						url: url + ".jpg",
						title: obj.title
					};
				});
			}
			
			return ret;
		},
		responseCountOffset: function( response ){
			return +response.query.count > 0 && !$.isArray(response.query.results.photo) && !response.query.results.photo.url
				? -1
				: -0;
		}
	});

	// register bing's api
	apis.register("bing", {
		select: ['*'],
		from: 'microsoft.bing.image',
		where: 'query',
		process: function( response ){
			var ret = [];
			if( +response.query.count > 0 ){
				$.each(response.query.results.ImageResult, function(i, obj){
					ret[i] = {
						thumbnail_url: obj.Thumbnail.Url,
						url: obj.MediaUrl,
						title: obj.Title
					};
				});
			}
			
			return ret;
		}
	});
	
	// render these APIs into the template
	var tmplSources = $("#tmplSources");
	$.each(apis.get(), function( name ){
		tmplSources.tmpl({ name:name }).appendTo("#sources");
	});
	
	// when a source is changed...
	core.form
		.bind("submit", false)
		.find(":checkbox[name=source]")
		.bind("click", function( e, init ){
			$.publish("/form/toggleSource", [ this.id, this.checked, init ]);
		})
		.each(function(){
 			$(this).triggerHandler("click", true); // run em on page load
		});
	
	// change hash on keyup
	core.keyword
		.bind("keyup", core.throttle(function( event ){
			window.location.hash = encodeURIComponent( this.value );
		}, 300));
	
	// reset button
	$("#reset")
		.bind("click", function(){
			$.publish("/form/reset");
		});
	
	// listen for a hash change to publish form submission, and trigger event on page load
	$(window)
		.bind("hashchange", function(){
			var hash = decodeURIComponent(window.location.hash.replace('#', ''));
			core.keyword.val( hash );
			$.publish("/form/submit", [ hash ]);
		})
		.trigger("hashchange");
});
