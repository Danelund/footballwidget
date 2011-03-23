<?php 
elgg_register_event_handler('init', 'system', 'urbfotmap_init');

function urbfotmap_init() {        
    elgg_register_widget_type('footballmap', 'Urbanfootballers map', 'The Urbanfootballers map widget');
	//register js
	//elgg_register_js('mapjs', 'mod/footballmap/js/footballgeo.js');
}

?>
