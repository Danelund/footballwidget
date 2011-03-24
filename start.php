<?php 
elgg_register_event_handler('init', 'system', 'footballmap_init');

function footballmap_init() {        
    elgg_register_widget_type('footballmap', 'Urbanfootballers map', 'The Urbanfootballers map widget');
	//register js
	elgg_register_js('googlemaps','http://maps.google.com/maps/api/js?sensor=true&key=ABQIAAAA9Z6c78wDIOMA_P5hCGA_txT3yTpmkmfEZnimNVuqNDexX4MftxTC5hCH8xNQijRyGT01afL7EjNK8g','head', 498);
	elgg_register_js('localjs', 'mod/footballmap/js/localizedstrings_enUS.js','head', 499);
	elgg_register_js('mapjs', 'mod/footballmap/js/footballgeo.js','head', 500);
	
	//create menuitem
	$item = new ElggMenuItem('footballmap', 'footballmap', 'footballmap');
	elgg_register_menu_item('site', $item);
	
	//register pages
	elgg_register_page_handler('footballmap','footballmap_page_handler');
}

function footballmap_page_handler()
{
	$params['body'] = elgg_view('footballmap/map');
	$params['sidebar'] = elgg_view('footballmap/sidebar');
	$body = elgg_view_layout('content', $params);

	echo elgg_view_page($params['title'], $body);
}

?>
