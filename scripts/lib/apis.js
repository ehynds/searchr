define(function(){
	var template = {
			select: [],
			from: '',
			where: '',
			and: {},
			process: $.noop,
			responseCountOffset: function(){
				return 0;
			}
		},
		apis = {},
		length = 0;
	
	return {
		register: function( name, object ){
			apis[name] = $.extend({}, template, object);
			length++;
		},
		get: function(){
			return apis;
		},
		length: function(){
			return length;
		}
	}
});