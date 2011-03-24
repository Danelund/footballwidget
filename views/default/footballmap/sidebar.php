<?php

$content='
  <div id="sidebar">
  <input id="GeoCoderSearch" type="text" autocomplete="off" /><button id="searchdrop" title="<?php echo $lang[\'AdvancedSearch\']; ?>">&nbsp;</button>
  <div id="maplist">
  <ul id="markerlist">
  	<li id="searchpanel"></li>
  </ul>
  </div>';
  echo elgg_view_module('aside','sidebar',$content);
?>
  