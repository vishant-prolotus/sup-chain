$(document).ready(function() {
	
 $("#owl-demo").owlCarousel({
 
      navigation : false, // Show next and prev buttons
      slideSpeed : 300,
      paginationSpeed : 400,
      singleItem:true
 
      // "singleItem:true" is a shortcut for:
      // items : 1, 
      // itemsDesktop : false,
      // itemsDesktopSmall : false,
      // itemsTablet: false,
      // itemsMobile : false
 
  });
  
  $("#owl-demo3").owlCarousel({
 
      navigation : false, // Show next and prev buttons
      slideSpeed : 300,
      paginationSpeed : 400,
      singleItem:true
 
      // "singleItem:true" is a shortcut for:
      // items : 1, 
      // itemsDesktop : false,
      // itemsDesktopSmall : false,
      // itemsTablet: false,
      // itemsMobile : false
 
  });
  
 var owl = $("#owl-demo2");
  owl.owlCarousel({
     autoPlay: 3000,
      itemsCustom : [
        [0, 2],
        [450, 3],
        [600, 3],
        [700, 3],
        [1000, 4],
        [1200, 5],
        [1400, 5],
        [1600, 6]
      ],
      navigation : false,
  });
  
  ///waoo js
	 new WOW().init();
	 //grid
	 
	$('#myTabs a').click(function (e) {
	  e.preventDefault()
	  $(this).tab('show')
	})
	
	
	$('.nav.nav-tabs li a.all').on('click',function(){
		//alert('alll')
		$('.tab-content').find('.tab-pane').addClass('active wow slideInDown')
	})
	
	$('.nav.nav-tabs li').on('click',function(){
		$('.nav.nav-tabs li ').removeClass('active2 active')
		$(this).addClass('active2')
	})
	
	$('#myModal').on('shown.bs.modal', function () {
  		$('#myInput').focus()
	})

 });
  