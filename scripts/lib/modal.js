define(function(){
	var overlay = $("#modal"),
		html = $("html"),
		win = $(window),
		spinner = $("#modal-spinner");
	
	function hideHandler( event ){
		if( event.type === "click" || event.which === 0 ){
			modal._isOpen() && modal.close();
		}
	}
	
	// hide an open modal on overlay click
	overlay.bind("click", hideHandler );
	
	// hide an open modal on esc key
	$(document).bind("keypress", hideHandler);
	
	// open modal when a thumb is clicked on
	$("#target").delegate("a", "click", function( event ){
		modal.open( this.href );
		event.preventDefault();
	});
	
	// reposition the overlay on scroll
	win.bind("scroll", function(){
		modal._isOpen() && modal._positionModal();
	});

	var modal = {
		open: function( src ){
			var self = this;
			
			spinner.show();
			
			// create the image element the first thing this is clicked
			if( typeof this.img === "undefined" ){
				this.img = $("<img />")
					.bind("load", function(){
						self.load( true );
					})
					.bind("error", function(){
						alert("error loading this image :(");
						self.close();
					})
					.attr("src", src);
			} else {
				this.img.hide().attr("src", src);
			}
			
			// move the modal based on the current scroll position
			this._positionModal();
		},
		close: function(){
			overlay.hide();
			spinner.hide();
		},
		load: function( init ){
			var img = this.img;
			
			// the first time an image is loaded append it to the modal
			init && img.appendTo( overlay );
			
			// center it
			img.show().css({
				"margin-left": -img.width()/2,
				"margin-top": -img.height()/2
			});
			
			spinner.hide();
		},
		_positionModal: function(){
			overlay.show().css("top", win.scrollTop());
		},
		_isOpen: function(){
			return overlay.is(":visible");
		}
	};
});