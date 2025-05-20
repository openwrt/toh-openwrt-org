/*
	Copyright (c) 2024 Francois Dechery

	This program is free software: you can redistribute it and/or modify it under the 
	terms of the GNU General Public License as published by the Free Software Foundation, 
	either version 2 of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; 
	without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
	See the GNU General Public License for more details.

	You should have received a copy of the GNU General Public License along with this program. 
	If not, see <https://www.gnu.org/licenses/>. 
 */

// variables ##################################################################################################################


const toh_img_urls=[];	// holds all images urls

let toh_firmwares=[]; 				// holds all releases
let toh_firmwares_fetched=false;	// confirm if releases have been fetched




// Functions for Cell Model Popup Formatter ###################################################################################

// get my Columns definitions -----------------------------------
function getMyColumnDefinition(field){
	let cols=toh_colStyles;
	let col={};
	if(typeof(cols[field]) != 'undefined' ){
		col=cols[field];
		if(typeof(col.headerTooltip) != 'undefined' && col.headerTooltip !==''){
			col.f_title=col.headerTooltip;
		}
		else if(typeof(col.title) != 'undefined' && col.title !==''){
			col.f_title=col.title;
		}
		else{
			col.f_title=field;
		}
	}
	else{
		col.f_title=field;
	}
	return col;
}

// makes an A tag from an URL ----------------------------------------------
function formatLinkToHtml(url, name='link', target_blank=true){
	let pattern = /^http(s)?:\/\//;
	let target='';
	if(target_blank){
		target='_blank';
	}
	if(pattern.test(url)){
		return '<a href="'+url+'" target="'+target+'" title="'+url+'">'+name+'</a>';
	}
	return url;
}




// Filters functions ##########################################################################################################

// Make filter Preset Button ------------------------------------------
function htmlFilterPresetButton(myclass, value){
	var icon='';
	var name=value;
	name = name.replace(/_/g,' ');
	name = name.replace(/(^\w{1})|(\s{1}\w{1})/g, match => match.toUpperCase()); // UcFirst
	return '<a href="#" class="'+myclass+'" data-key="'+value+'">'+icon+name+'</a>'+"";
}

// Make Filter Preset ------------------------------------------
function htmlFilterDiv(filt,key,is_feature=false){
	var html='';
	var myclass='preset';
	if(is_feature){
		myclass='feature';
	}
	if(filt.type=='admin'){
		myclass +=" toh-filter-admin";
	}
	html +='<div class="toh-filter toh-filter-'+myclass+'">';
	html +='<span class="toh-filter-title">';
	if(is_feature){
		var only=''
		if(typeof filt.only =='string'){
			only=filt.only;
		}
		html +='<input type="checkbox" data-key="'+key+'" data-only="'+only+'">';
	}
	html +='<a href="#" class="toh-filter-button" data-key="'+key+'" title="';
	if(is_feature){
		html +=makeFeatureDescription(key);
	}
	html +='">'+filt.title+'</a></span>';
	html +='<span class="toh-filter-description">'+filt.description+'</span>';
	html +="</div>\n";
	return html;
}

// display Filters Presets ------------------------------------------------
function buildFiltersPresets(){
	tmp_html='';
	for (const key in toh_filterPresets){
		tmp_html+=htmlFilterDiv(toh_filterPresets[key],key);
	}
	$('#toh-filters-presets .toh-filters-list').html(tmp_html);
}

// display Filters Features ------------------------------------------------
function buildFiltersFeatures(){
	tmp_html='';
	for (const group in toh_filterGroups){
		tmp_html +=htmlGroup(toh_filterGroups[group].title,group,'filt');
		toh_filterGroups[group].members.forEach(filt => {
			tmp_html +=htmlFilterDiv(toh_filterFeatures[filt],filt,true);
		});
		tmp_html +="</ul>\n</div>\n";
	}
	$('#toh-filters-features-content').html(tmp_html);
}

// Formats one Filter description -------------------------------------
function formatFilterDesc(filter){
	var title=toh_colStyles[filter.field].title;
	return title + " " + filter.type + " '" +filter.value + "'"; 
}

// Makes the Feature Tooltip ------------------------------------------
function makeFeatureDescription(key){
	var features=toh_filterFeatures[key];
	var desc='';
	var done_and=false;
	var done_or=false;
	$.each(features.filters,function(i,filter){
		if(Array.isArray(filter)){
			desc +="(";
			$.each(filter,function(j,orfilter){
				if(done_or){
					desc +=" OR ";
				}
				desc +=formatFilterDesc(orfilter);
				done_or=true;
			});
			desc +=") ";
			done_or=false;
		}
		else{
			if(done_and){
				desc +=" AND ";
			}
			desc +=formatFilterDesc(filter);
		}
		done_and=true;
	});
	return desc;
}

// Check on/off ALL features checkboxes -------------------------
function checkAllFeatures(state=true){
	$(".toh-filter-feature INPUT").prop('checked',state);
}

// Check on/off a feature checkbox ------------------------------
function checkFeature(key,state=true){
	if(state){
		var group=$(".toh-filter-feature INPUT[data-key="+key+"]").attr('data-only');
		//myLogStr(group,1);
		if(group.length > 0){
			$(".toh-filter-feature INPUT[data-only="+group+"]").prop('checked',false);
		}
	}
	$(".toh-filter-feature INPUT[data-key="+key+"]").prop('checked',state);
}

// Show or Hide ALL features --------------------------------------
function clearAllFeatures() {
	tabuTable.clearFilter();
}

// Return a (flatted) list of the current filtered fields ------------------
function getTableFiltersFields(type='filters'){
	var fields=[];
	if(type=='filters'){
		var filters	=tabuTable.getFilters();
	}
	else if(type=='headerfilters'){
		var filters	=tabuTable.getHeaderFilters();
	}
	else{ // all
		var filters	=tabuTable.getFilters(true);
	}
	myLogFunc('getTableFiltersFields type='+type+' ----');
	myLogObj(filters,'filters');
	$.each(filters,function(i,f){
		if(Array.isArray(f)){
			$.each(f,function(j,ff){
				if (!fields.includes(ff.field)){
					fields.push(ff.field);					
				}
			});
		}
		else{
			if (!fields.includes(f.field)){
				fields.push(f.field);					
			}
		}

	});
	myLogObj(fields,'fields');
	return fields;
}

// Apply a Filter Preset ----------------------------------------------------
function applyFilterPreset(key){
	myLogFunc();
	var set=getFilterSet('preset',key);
	if(Object.keys(set).length > 0 ){
		myLogStr('key: '+key);
		myLogObj(set.filters,'Filter Set');
		myLogObj(tabuTable.getFilters(),'Tabu Filters (before)');

		setPresetSelectedClass('features',key);
		showLoading();

		tabuTable.clearFilter();			// needed?
		tabuTable.setFilter(set.filters ); //,  {matchAll:true}

		myLogObj(tabuTable.getFilters(),'Tabu Filters (after)');

		checkAllFeatures(false);
		if(set.features.length > 0 ){		
			$.each(set.features,function(j,feat){
				checkFeature(feat);
			});	
		}
	}
}

// Check a Filter Feature and clear current preset -------------------------
function checkFeatureAndClearPreset(key,bool){
	myLogFunc('checkFeatureAndClearPreset : '+key+' / '+bool);
	var set=getFilterSet('feature',key);
	if(typeof(set.filters) !='object'){
		return false;
	}
	myLogObj(set.filters,'filter set');
	if(set.filters.length > 0){
		myLogObj('Set feature '+key+' DONE!');
		setPresetSelectedClass('features','custom');	
		checkFeature(key,bool);
		//applyCheckedFeatures();
	}
}

// set tabulator filters from checked features --------------------------------------
function applyCheckedFeatures(){
	myLogFunc();
	var features=getCheckedFeatures();
	myLogObj(features,'checked features');
	var filters=[];
	features.forEach(feat => {
		var feat_filters=toh_filterFeatures[feat].filters;
		feat_filters.forEach(filt => {
			if(typeof filt === 'object'){
				filters.push(filt);
			}
		});
	});
	showLoading();
	filters=reorderFilters(filters); // certainly not needed, but eases debug
	tabuTable.setFilter(filters);
}


// reorder filters : objects, then arays-----------------------------------------------
function reorderFilters(filters) {
	myLogFunc();
	const simpleFilters = [];
	const arrayFilters = [];

	filters.forEach(filter => {
		if(Array.isArray(filter)) {
			arrayFilters.push(filter);
		} 
		else if(typeof filter === 'object' && filter !== null) {
			simpleFilters.push(filter);
		}
	});
	return [...simpleFilters, ...arrayFilters];
}


// get filters array (also merge features filters for Presets)--------------------
function getFilterSet(type, key){
	myLogFunc();
	if(type=='preset' && key in toh_filterPresets){
		var set=JSON.parse(JSON.stringify(toh_filterPresets[key])); // makes a clone
	}
	else if(type=='feature' && key in toh_filterFeatures){
		var set=JSON.parse(JSON.stringify(toh_filterFeatures[key])); // makes a clone
	}
	else{
		myLogStr('getFilterSet - Type: '+ type +', Unknown key: "'+key+'"');
		return {};
	}

	//merge filters with features.filters
	if(type=='preset'){
		if( typeof(set.features) =='object'){ // cant we write it shorter ?
			$.each(set.features,function(i,fv){
				// myLogStr(i+'->'+fv,4);
				$.each(toh_filterFeatures[fv].filters,function(j,filt){
					set.filters.push(filt);
				});
			});
		}
		else{
			set.features={};
		}
	}
	// myLogObj(set,'Filter Set');
	return set;
}

// preload DB images -----------------------------------------------
function PreLoadImagesCache(){
	if(!toh_prefs.preload){
		return;
	}
	toh_img_urls.forEach(url => {
		const img = new Image();
		img.src = url;
	});
}




// Views functions ############################################################################################################

// Make a column line -------------------------------------------
function htmlColumnLine(field,col,checked){
	let html='';
	let title	=col.title;
	let tip		=col.headerTooltip;
	if(tip==true){tip='';}
	html +='<div class="toh-col toh-col-column">';
	html +='<input type="checkbox" data-key="'+field+'"';
	if( checked ){html +=' checked="true"';} 
	html +='> <a href="#" title="'+tip+'">'+title+"</a>\n";
	html +="</div>";
	return html;
}

// Make a column Group  ------------------------------------------
function htmlGroup(title,group,type){
	let html='';
	let names={
		view: 'toh-viewgroup',
		filt: 'toh-filtgroup',
	};
	let icons={
		view: 'fa-solid fa-square',
		filt: 'fa-solid fa-filter',
	};
	let ttip={
		view: 'Toggle group visibility',
		filt: '',
	};
	html +='<div class="toh-group '+names[type]+'" data-group="'+group+'">'+"\n"+'<div class="toh-group-title '+names[type]+'-title"><a href="#" class="view-link" title="'+ttip[type]+'"><i class="'+icons[type]+'"></i> '+title+'</a></div>'+"\n";
	html +='<ul>'+"\n";
	return html;
}

// Display the views presets ---------------------------------
function buildViewsPresets(){
	var tmp_html='';
	tmp_html+=htmlFilterPresetButton('toh-view toh-view-custom','custom');
	tmp_html+=htmlFilterPresetButton('toh-view','all');
	tmp_html+=htmlFilterPresetButton('toh-view','none');
	for (const key in toh_colPresets){
		tmp_html+=htmlFilterPresetButton('toh-view',key);
	}
	$('#toh-cols-presets').html(tmp_html);
}

// Displays the views Columns ---------------------------------
function buildViewsColumns(){
	let columns = tabuTable.getColumnDefinitions();  
	let view="";
	let col={};

	// display known (on Prefs) fields
	$.each(toh_colGroups,function(key,arr){
		view +=htmlGroup(arr.name,key,'view');
		$.each(arr.fields,function(k,field){
			col=tabuTable.getColumn(field);
			view +=htmlColumnLine(field, col.getDefinition(), col.isVisible())
			//remove from colums
			const index = columns.findIndex(item => item.field === field);
			if (index !== -1) {columns.splice(index, 1)[0];}
		});
		view +="</ul>\n</div>\n";
	});

	// handle remaining unsorted fields (not defined in Prefs)
	if(columns.length > 0){
		view +=htmlGroup('Unsorted','unsorted','view');
		$.each(columns,function(key,arr){
			// if(arr.field === undefined){
			// 	return;
			// }
			col=tabuTable.getColumn(arr.field);
			var def=col.getDefinition();
			def.headerTooltip +=' ('+arr.field+')'; //auto column dont have a tootil (only 'true')
			view +=htmlColumnLine(arr.field, def , col.isVisible())
		});
		view +="</ul>\n</div>\n";
	}

	$("#toh-cols-columns-content").html(view);
	updateColGroupIcons();
}

// Check on/off a Column checkbox ------------------------------
function checkColumn(key,state=true){
	$(".toh-col-column INPUT[data-key="+key+"]").prop('checked',state);
	updateColGroupIcons();
}

// Check on/off ALL Columns checkboxes -------------------------
function checkAllColumns(state=true){
	$(".toh-col-column INPUT").prop('checked',state);
	updateColGroupIcons();
}

//  Show and Check on/off Column checkbox ------------------------------
function showAndCheckColumn(col,state=true){
	myLogFunc('showAndCheckColumn : '+col+' / '+state);
	showLoading();
	if(state){
		tabuTable.showColumn(col);
	}
	else{
		tabuTable.hideColumn(col);
	}
	UpdateCountCols();
	checkColumn(col,state);
}

//  Show and Check Persistent Columns ------------------------------
function showAndCheckPersistentColumns(){
	showAndCheckColumn('VIRT_edit');
	showAndCheckColumn('brand');
	showAndCheckColumn('model');
}

// Show or Hide ALL columns --------------------------------------
function showAllColumns(bool) {
	myLogFunc();
	var columnDefs = tabuTable.getColumnDefinitions();  
	columnDefs.forEach(function(column) {
		if(bool){
			tabuTable.showColumn(column.field);
		}
		else{
			tabuTable.hideColumn(column.field);
		}
	});
	UpdateCountCols();
}

// Apply a View Preset : show/hide columns -----------------------
function applyColumnPreset(key){
	myLogFunc();
	showLoading();
	//tabuTable.blockRedraw();
	setTimeout(function(){
		if(key=='all'){
			setPresetSelectedClass('columns',key);
			checkAllColumns(true);
			showAllColumns(true);
		}
		else if(key=='none'){
			setPresetSelectedClass('columns',key);
			checkAllColumns(false);
			showAllColumns(false);
		}
		else{
			var set=getColumnSet(key);
			if(set.length > 0){
				setPresetSelectedClass('columns',key);
				checkAllColumns(false);
				showAllColumns(false);
				set.forEach(col => {
					showAndCheckColumn(col);
				});	
			}
		}
	},0);
	//tabuTable.redraw(true);
	//tabuTable.restoreRedraw();
}

// Apply a (single) Column : show/hide -----------------------
function applyColumCol(key,state){
	myLogFunc();
	setPresetSelectedClass('columns','custom');	
	showAndCheckColumn(key,state);
}

// get filters array (also merge features filters for Presets)--------------------------
function getColumnSet(key){
	myLogFunc();
	set=[];
	if(key=='all'){
		$.each(toh_colPresets,function(k,col){
			if(!set.includes(col)){
				set.push(col);
			}
		});
	}
	else if (key=='none'){
		set=[];
	}
	else if(typeof(toh_colPresets[key]) !='undefined'){
		set=toh_colPresets[key];
	}
	return set;
}

// set columns view depending on the selected Filter option ---------------------------------
function applyColumnsFromFilters(){
	myLogFunc();
	var opt=$("#toh-filters-options INPUT[name='filtcol']:checked").val();
	var fields	=getTableFiltersFields('all');
	showLoading();
	setTimeout(function(){
		if(opt=='add'){
			setPresetSelectedClass('columns','custom');
			$.each(fields,function(i,col){
				showAndCheckColumn(col);
			});
			showAndCheckPersistentColumns();
		}
		else if(opt=='repl'){
			setPresetSelectedClass('columns','custom');
			showAllColumns(false);
			checkAllColumns(false);
			$.each(fields,function(i,col){
				showAndCheckColumn(col);
			});
			showAndCheckPersistentColumns();
		}
	},0);
}

// Update group Icons in the columns block ------------------
function updateColGroupIcons(){
	myLogFunc();
	$('.toh-viewgroup').each(function(i){
		var total=$(this).find('.toh-col-column').length;
		var checked=$(this).find('.toh-col-column INPUT:checked').length;
		var icon ="";
		if(checked==total){
			icon='fa-regular fa-square-check';
		}
		else if(checked==0){
			icon='fa-regular fa-square';
		}
		else{
			icon='fa-regular fa-square-minus';
		}
		$(this).find('.toh-viewgroup-title I').removeClass().addClass(icon);
	});
}

//
function setPresetSelectedClass(type,key=''){
	myLogFunc('setPresetSelectedClass : '+type+'/'+key);
	var myclass='toh-selected';
	if(type=='features'){
		var sel='.toh-filters-presets';
	}
	else if(type=='columns'){
		var sel='#toh-cols-title .toh-top-title-presets';

	}
	else{
		myLogStr('setPresetSelectedClass - Unkwnon type:'+type,1);
		return false;
	}
	if(key !=''){
		$(sel+' A').removeClass(myclass);
		$(sel+' A[data-key='+key+']').addClass(myclass);
		//toh_current_preset.columns=key;
	}
	else{
		$(sel+' A').removeClass(myclass);
		//toh_current_preset.columns='';
	}
}




// URL functions ##############################################################################################################

// Get Url parameter -----------------------------------------------
function getUrlParameter(name) {
	name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
	var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
	var results = regex.exec(location.search);
	return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Get Url parameter or default value -----------------------------
function getUrlParameterOrDefault(name, defaultValue='') {
	var value = getUrlParameter(name);
	return value !== '' ? value : defaultValue;
}

// update the browser Url (without reloading the page) ------------
function updateBrowserUrl(newURL) {
	const state = {}; // State object
	const title = ''; // Title (ignored by most browsers)
	history.replaceState(state, title, newURL);
}

// get the currently checked features ---------------
function getCheckedFeatures(){
	var checked=[];
	$('.toh-filters-list INPUT').each(function(i){
		if($(this).is(':checked')){
			checked.push($(this).attr('data-key'));
		}
	});
	return checked;
}

// get the currently checked columns ---------------
function getCheckedColumns(){
	var checked=[];
	$('.toh-col-column INPUT').each(function(i){
		if($(this).is(':checked')){
			checked.push($(this).attr('data-key'));
		}
	});
	// myLogObj(checked,'checked');
	return checked;
}

// build, then update the browser Url  ------------------------------
function buildBrowserUrl(and_update=true){
	myLogFunc();
	var url=window.location.pathname;
	var params=[];
	var tmp_list;
	var tmp_preset;

	// make features
	tmp_preset=$('#toh-filters-presets A.toh-selected').attr('data-key');
	if(tmp_preset !=undefined){
		params.push(toh_prefs.p_filter+'='+tmp_preset);
	}
	else{
		tmp_list= getCheckedFeatures();
		if(tmp_list.length>0){
			params.push( toh_prefs.p_features+'='+tmp_list.join(",") );
		}
	}

	// make colums
	tmp_preset=$('#toh-cols-presets A.toh-selected').attr('data-key');
	if(tmp_preset !=undefined && tmp_preset !='custom'){
		params.push(toh_prefs.p_view+'='+tmp_preset);
	}
	else{
		tmp_list= getCheckedColumns();
		if(tmp_list.length>0){
			params.push( toh_prefs.p_columns+'='+tmp_list.join(",") );
		}  
	}

	if(and_update){
		url +="?";
		url +=params.join('&');
		updateBrowserUrl(url);
	}
	//myLogStr('URL: '+url);
}




// Cookie functions ###########################################################################################################

// save a cookie ---------------------------------------------------
function saveCookie(c_name, content, do_delete=false, type='json'){
	myLogFunc();
	var c_path=toh_prefs.cook_path;
	if(c_path==''){
		c_path=window.location.pathname;
	}
	var c_content=content;
	if(type=='json'){
		c_content=JSON.stringify(content);
	}
	var dur=toh_prefs.cook_duration;
	if(do_delete){
		dur=0;
	}
	document.cookie = toh_prefs.cook_prefix + c_name + "=" + encodeURIComponent(c_content) + "; max-age="+dur+"; path="+c_path;
}

// extract a cookie from the list---------------------------------------------------
function _extractCookie(name) {
	myLogFunc();
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
  }

// load a cookie ---------------------------------------------------
function loadCookie(c_name, type='json'){
	myLogFunc('loadCookie name: '+c_name);
	var cookie=_extractCookie(toh_prefs.cook_prefix + c_name);
	myLogStr('result: '+cookie);

	if(cookie){
		var c_content=decodeURIComponent(cookie);
		if(type=='json'){
			return JSON.parse(c_content);
		}
		else{
			return c_content;
		}
	}
	else{
		return false;
	}
}

// Load All Preset Cookies -----------------------------
function loadPresetCookies(type){ //'features' or 'columns'
	myLogFunc('loadCookie name: '+type);
	var c_value	='';

	for (let i = 1; i <= toh_prefs.cook_preset_count; i++) {
		c_value=loadCookie(toh_prefs['cook_name_'+type]+i);
		myLogStr('p'+i+' / '+c_value,4);
		if(typeof(toh_cookies[type]) !='object'){
			myLogStr('create type:'+type,4);
			toh_cookies[type]={};
		}
		if(c_value !=undefined || c_value==''){
			myLogStr('save: '+c_value,4);
			toh_cookies[type][i]=c_value;
		}
		else{
			myLogStr('create index: '+i,4);
			toh_cookies[type][i]={};
		}		
	}
	myLogObj(toh_cookies,'result',4);
}

// Store User Preset in Cookie -----------------------------
function storePresetCookie(type, number=0, name='user'){ // type= 'features' or 'columns'
	myLogFunc('storePresetCookie: '+type+', '+number+', '+name);
	if(name==''){
		name=number;
	}
	var preset={
		name: name,
		list: []
	};
	if(type=='features'){
		preset.list=getCheckedFeatures();
		saveCookie(toh_prefs.cook_name_features+number, preset);
		toh_cookies[type][number]=preset;
	}
	else if(type=='columns'){
		preset.list=getCheckedColumns();
		saveCookie(toh_prefs.cook_name_columns+number, preset);
		toh_cookies[type][number]=preset;
	}
	myLogObj(preset.list,'preset.list',4);
}

// Delete User Preset Cookie --------------------------
function deletePresetCookie(type, number){
	if(type=='features'){
		saveCookie(toh_prefs.cook_name_features+number, false,true);
	}
	else if(type=='columns'){
		saveCookie(toh_prefs.cook_name_columns+number, false,true);
	}
}

// Build User Preset Menu -----------------------------
function buildUserPresets(type){// type= 'features' or 'columns'
	myLogFunc('buildUserPresets: '+type);
	var sel='';
	var name='';
	var html='';
	if(type=='features'){
		sel="#toh-filters-upresets .toh-upresets-content";
	}
	else if(type=='columns'){
		sel="#toh-cols-upresets .toh-upresets-content";
	}
	else{
		return false;
	}
	for (let i = 1; i <= toh_prefs.cook_preset_count; i++) {
		myLogStr('pr'+i,4);
		var myclass='';
		if(typeof(toh_cookies[type][i])=='object'){
			if(typeof(toh_cookies[type][i].name) =='string'){
				name=toh_cookies[type][i].name;
				myclass="toh-used";
			}
			else{
				name=i;
			}
		}
		else{
			name=+i;
		}
		html +='<a href="#" class="toh-upreset-but '+myclass+'" data-key="'+i+'" data-type="'+type+'">'+name+'</a>';
	}
	$(sel).html(html);
}

// Appy a User Preset -----------------------------------------------
function applyUserPreset(type,num){
	myLogFunc();
	var preset=toh_cookies[type][num];
	if(preset==false){
		myLogStr('empty preset: '+type+'/'+num,1);
	}
	if(type=='features'){
		setPresetSelectedClass(type,'custom');
		clearAllFeatures();
		checkAllFeatures(false);
	}
	else if(type=='columns'){
		setPresetSelectedClass(type,'custom');
		showAllColumns(false);
		checkAllColumns(false);
	}
	else{
		return false;
	}
	$.each(preset.list,function(i,key){
		if(type=='features'){
			checkFeatureAndClearPreset(key,true);
		}
		else if(type=='columns'){
			applyColumCol(key,true);
		}
		else{
			return false;
		}
	});
	if(type=='features'){
		applyCheckedFeatures();
	}
}

// Load Cookies and Build User Preset menu -----------------------------
function loadCookiesAndBuildUserPresets(){
	loadPresetCookies('features');
	loadPresetCookies('columns');
	buildUserPresets('features');
	buildUserPresets('columns');
	$(".toh-upresets-title A").prop('title',toh_prefs.tooltip_upreset);
	
}




// Log functions ##############################################################################################################

// custom log String -----------------------------------------------------
function myLogStr(line=null, level=2, is_title=false) { // levels: 1=info, 2=debug, 3=verbose, 4=full

	if(level > toh_debug_level){
		return;
	}
	const pad_lenght=80;
	const p='-';
	if(is_title){
		line =p+p+" "+ line + " ";
		line =line.padEnd(pad_lenght,p);
	}
	else{
		line= " - "+line;
	}

	console.log(line);
}
// custom log Function -----------------------------------------------------
function myLogFunc(custom_title=null,level=3){
	if(level > toh_debug_level){
		return;
	}
	if(custom_title==null){
		//custom_title= arguments.callee.caller.name;
		custom_title=getCallerName();
	}
	myLogStr(custom_title,level,true);
}
// custom log Object -------------------------------------------------------
function myLogObj(obj,desc='',level=3) {
	if(level > toh_debug_level){
		return;
	}
	if(desc.length>0){
		desc=desc + ": ";
	}

	console.log(" * "+desc+": ",obj);
}
// get the Calling func name
function getCallerName() {
	try {
		throw new Error();
	} catch (e) {
		const stack = e.stack.split('\n');
		// The caller is typically the third item in the stack
		const callerLine = stack[2];
		//myLogObj(callerLine,'Stack');
		// Extract the function name using regex
		const match = callerLine.match(/(at)?\s*([^@]+)/);
		//myLogStr('found: '+match[2]);
		return match ? match[2] : 'anonymous';
	}
  }




// Misc functions #############################################################################################################

async function FetchReleases() {
	try {
		const versionData = await $.ajax({
			url: toh_urls.firm_versions,
			method: 'GET'
		});
		const cur_url = toh_urls.firm_releases.replace('VERSION', versionData.stable_version);

		const releaseData = await $.ajax({
			url: cur_url,
			method: 'GET'
		});

		toh_firmwares = releaseData.profiles;
		toh_firmwares_fetched =true;
	} 
	catch (error) {
		myLogObj(error,'Error fetching releases', 1);
	}
}

function GetFirmwareSelectUrl(id, target) {
	const found= toh_firmwares.some(item => item.id == id && item.target == target);
	if(found){
		return toh_urls.firm_select + '?target='+ target + "&id=" + id;
	}
	return false;
}

// Position the Image Preview div -------------------------------
function positionPreview($link, $container) {
	var linkOffset = $link.offset();
	var linkWidth = $link.outerWidth();
	var linkHeight = $link.outerHeight();
	var containerWidth = $container.outerWidth();
	var containerHeight = $container.outerHeight();
	var windowWidth = $(window).width();
	var windowHeight = $(window).height();
	var scrollTop = $('BODY').scrollTop();

    // Calculate position
    let left = offset.left + (linkWidth / 2) - (containerWidth / 2);
    let top = offset.top + linkHeight + 5;

    // Ensure preview stays within window bounds
    if (left + containerWidth > windowWidth) {
        left = windowWidth - containerWidth - 10;
    }
    if (left < 0) {
        left = 10;
    }
    
    // If preview would go below viewport, show it above the link instead
    if (top + containerHeight > scrollTop + windowHeight) {
        top = offset.top - containerHeight - 5;
    }

    // Apply position with smooth transition
    $container.css({
        left: Math.round(left) + 'px',
        top: Math.round(top) + 'px',
        opacity: 1,
        visibility: 'visible',
        transition: 'opacity 0.2s ease-in-out'
    });
}



var loading_is_running	= false;
var loading_last_time 		= 0;
const loading_duration	= 400;
// Show Loading --------------------------------------------------------
function showLoading(){
	myLogFunc();
	if(!loading_is_running){
		loading_is_running	=true;
		loading_last_time	= Date.now();
		ChangeFavicon('anim');
		$('#toh-header-loading').show();
		$('BODY').addClass('toh-loading');
	}
}
// Hide Loading --------------------------------------------------------
function hideLoading() {
	myLogFunc();
	if(loading_is_running){
		const timeSinceShow = Date.now() - loading_last_time;
		if (timeSinceShow < loading_duration) {
			setTimeout(hideLoading, loading_duration - timeSinceShow);
		}
		else {
			ChangeFavicon('trans');
			$('#toh-header-loading').hide();
			$('BODY').removeClass('toh-loading');
			loading_is_running = false;
		}
	}
}

// Change the favicon  --------------------------------------------------
function ChangeFavicon(type){
	//myLogStr('START fav='+type,1);
	var el=$('link[rel=icon]');
	
	var icon='static/img/favicon_trans.png';
	if(type=='anim'){
		icon='static/img/favicon_anim.gif';
	}

	if(el.attr('href') == icon ){
		//myLogStr('fav ALREADY set',1);
		return;
	}
	el.prop('href',icon);
	return;

	// el.remove(); // Remove the old favicon
	// el = $('<link>', {
	// 	rel: 'icon',
	// 	href: icon
	// });
	// $('head').append(el);
	// el[0].offsetHeight; 

	// Force browser favicon repaint
	// document.title = document.title + ' '; // Trigger tab repaint
	// setTimeout(() => document.title = document.title.trim(), 50); // Reset title
}


// Set default Filters & View -------------------------------------------
function SetDefaults(){
	myLogFunc();

	//show presets
	if(toh_prefs.def_show_filters){
		$(".toh-filters-but-toggle").trigger('click');
	}

	//show views
	if(toh_prefs.def_show_views){
		$(".toh-cols-but-toggle").trigger('click');
	}

	var tmp_value;
	var tmp_arr;
		
	//columns or columns preset
	tmp_value=getUrlParameter(toh_prefs.p_columns);
	if(tmp_value == ''){
		// set preset
		tmp_value=getUrlParameterOrDefault(toh_prefs.p_view, toh_prefs.def_view);
		if(getColumnSet(tmp_value).length == 0){
			tmp_value=toh_prefs.def_view;
		}
		applyColumnPreset(tmp_value);
	}
	else{
		tmp_arr=tmp_value.split(',');
		$.each(tmp_arr,function(i,key){
			applyColumCol(key,true);
		});
	}
		
	//features or filter preset
	tmp_value=getUrlParameter(toh_prefs.p_features);
	if(tmp_value == ''){
		myLogStr('Set Filter Preset',4);
		// set preset
		tmp_value=getUrlParameterOrDefault(toh_prefs.p_filter, toh_prefs.def_filter);
		applyFilterPreset(tmp_value);
		//myLogStr('DONE',4);
	}
	else{
		myLogStr('Set Filter Features',4);
		tmp_arr=tmp_value.split(',');
		$.each(tmp_arr,function(i,key){
			checkFeatureAndClearPreset(key,true);
		});
		applyCheckedFeatures();
	}

	//myLogStr('SetDefaults URL',4);
	buildBrowserUrl();
	toh_table_inited=true;
}

// Display filtered / total count ------------------------------------------
function UpdateCountRows(){
	var html='';
	selected	=tabuTable.getDataCount("active");
	total		=tabuTable.getDataCount();
	if(selected < total){
		html='<b>'+selected+"</b> / ";
	}
	html +="<i>"+total+"</i>";
	$('.toh-count-rows-full').html(html);
	
	//$('.toh-count-rows').html(selected);
	$('#toh-bot-buttons OPTION[value=all]').html(total + " total");
	$('#toh-bot-buttons OPTION[value=active]').html(selected + " filtered");
}

// Display filtered / total count ------------------------------------------
function UpdateCountCols(){
	var html='';
	selected	=tabuTable.getColumns().filter(col => col.isVisible()).length;
	total		=tabuTable.getColumns().length;
	if(selected < total){
		html='<b>'+selected+"</b> / ";
	}
	html +="<i>"+total+"</i>";
	$('.toh-count-cols-full').html(html);	
	//$('.toh-count-cols').html(selected);
}

// jquery shake effect -----------------------------------------------------
$.fn.shake = function(interval = 100, distance = 10, times = 3) {
	this.css('position', 'relative');
	for (let i = 0; i < times + 1; i++) {
		this.animate({left: (i % 2 == 0 ? distance : distance * -1)}, interval);
	}
	return this.animate({left: 0}, interval);
};


/*
//create indexed object  ---------------------------------------
function createIndexedObject(arrayOfObjects, key) {
	return arrayOfObjects.reduce((acc, obj) => {
		if (obj.hasOwnProperty(key)) {
			acc[obj[key]] = obj;
		}
		return acc;
	}, {});
}
*/
// get Vitual Columns ------------------------------------------------------
function getVirtualColumns() {
	return Object.entries(toh_colStyles)
		.filter(([key]) => key.startsWith("VIRT_"))
		.map(([f, value]) => ({
			field: f,			// needed to allow col.getDefinition() to work
			visible: false,     // Hodden by default
			...value            // Spread existing properties
		}));
}

// --Fetch and Display the Changelog ----------------------------------------------------------------
function FetchAndPrintChangelog(){
	fetch('CHANGELOG.md')
    .then(response => response.text())
    .then(data => {
        const lines = data.split('\n');
        const result = [];
        let currentObject = null;
        
        // Process each line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for subtitle
            if (line.startsWith('##')) {
                if (currentObject) {
                    result.push(currentObject);
                }
                currentObject = {
                    title: line.substring(2).trim(), // Remove '##' and trim
                    list: ''
                };
            }
            // Check for bullet points if we have a current object
            else if (currentObject && line.startsWith('*')) {
                currentObject.list += (currentObject.list ? '\n' : '') + line;
            }
        }
        
        // Push the last object if it exists
        if (currentObject) {
            result.push(currentObject);
        }
        
        if (result.length > 0) {
    	    // Insert the first result 
			$('#toh-changelog-latest').html('<div class="toh-changelog-release"><h5>' + result[0].title + ' <span class="badge">v'+ toh_app.version +'</span></h5>' + snarkdown(result[0].list)) +'</div>';

			// then the others results
			var html='';
			for (let i = 1; i < result.length; i++) {
				html +='<div class="toh-changelog-release"><h5>' + result[i].title + '</h5>' + snarkdown(result[i].list) +'</div>';
            }
			$('#toh-changelog-previous').html(html);

			$("#toh-changelog").show();

        }
    })
    .catch(error => myLogStr('Cannot load CHANGELOG! Error: '+ error));
}













// ############################################################################################################################
// ## MAIN ####################################################################################################################
// ############################################################################################################################

var tabuTable;
var toh_table_inited=false;
var toh_cookies={};
// var toh_current_preset={
// 	features:	'',
// 	columns:	''
// };

$(document).ready(function () {
	// update html variables placeholders -----------------------------------
	$('.js-toh-app').each(function() {
		var prop = $(this).data('prop');	// Get the property name from data-prop attribute
		$(this).text(toh_app[prop]);		// Set the text content to the corresponding value from toh_app
	});
	// Add branch-dev class to body if branch is 'dev'
	if (toh_app.branch === 'dev') {
		$('body').addClass('branch-dev');
		FetchAndPrintChangelog();
	}

	//set title Link URL ----------------------------------------------------
	$('#toh-header-title H1 A').attr('href',window.location.pathname);

	// initialize table  -----------------------------------------------------
	tabuTable = new Tabulator("#toh-table", tabulatorOptions);

	// handles Image Preview on hover ----------------------------------------
	var $container = $('#toh-image-preview');
	$(document).on({
		mouseenter: function(e) {
			var $link = $(this);
			var imageUrl = $link.attr('href');
			
			// Create and load the image
			var $img = $('<img>').attr('src', imageUrl);
			
			// Clear previous content and add loading spinner
			$container.html('<div class="spinner"><i class="fa-solid fa-spinner fa-spin"></i></div>');
			$container.show();
			
			// Wait for the image to load before positioning
			$img.on('load', function() {
				$container.html($img);
				positionPreview($link, $container);
			});
		},
		mouseleave: function() {
			$container.hide().empty();
		}
	}, 'a.cell-image');


	// Observe the DOM to show/hide the loading icon  --------------------------
	// (because i've not found a Tabulator event to do that, ie when changing a large amount of column visibility)
	var observer = new MutationObserver(function(mutations) {
		// Debounce the callback to avoid multiple triggers
		clearTimeout(window.domChangeTimer);
		window.domChangeTimer = setTimeout(function() {
			// Trigger a custom event when DOM changes are complete
			$(document).trigger('table-change-complete');
		}, 100);
	});

	// Start observing the document body
	observer.observe(document.getElementById('toh-table'), { childList: true, subtree: true });

	// Bind to the custom event
	$(document).on('table-change-complete', function() {
		myLogStr('EVENT: table-change-complete');
		hideLoading();
		tableLoadingHide();
	});
	

	// make column order from the toh_colGroups ------------------------------
	let columnOrder=[];
	$.each(toh_colGroups,function(key,obj){
		$.each(obj.fields,function(f,field){
			columnOrder.push(field);
		});
	});

	//  Click: Toggle Filters Visibility -----------------------------
	$('.toh-filters-but-toggle').on('click',function(e){
		e.preventDefault();
		$('#toh-filters-container').toggle();
		$(this).children('I').toggleClass('fa-caret-right fa-caret-down');
	});

	//  Click: Toggle Views Visibility -------------------------------
	$('.toh-cols-but-toggle').on('click',function(e){
		e.preventDefault();
		$('#toh-cols-container').toggle();
		$(this).children('I').toggleClass('fa-caret-right fa-caret-down');
	});

	// Fetch content and build table ----------------------------------
	$('#toh-load-text').html('Fetching TOH devices...');
	FetchReleases().then(() => {
		$.getJSON( toh_urls.toh_json, function( data ){ 
			//Makes columns
			var columns = data.columns.map((value, index) => ({
				field: value,
				title: data.captions[index],
				visible: false,
				...toh_colStyles[value]
			}));

			// add vitual (not linked to existing fields) columns 
			var virtualColumns = getVirtualColumns();
			columns=[...columns, ...virtualColumns];

			//init table with data
			showLoading();
			tabuTable.setColumns(columns);
			tabuTable.setData(data.entries).then(() =>{
				// order columns			
				columns.sort((a, b) => {
					const indexA = columnOrder.indexOf(a.field);
					const indexB = columnOrder.indexOf(b.field);
					if (indexA === -1 && indexB === -1) return 0; // Both names not in order, keep original order
					if (indexA === -1) return 1; // a's name not in order, move to end
					if (indexB === -1) return -1; // b's name not in order, move to end
					return indexA - indexB;
				});
				tabuTable.setColumns(columns);
		
				// display Filters & views 
				buildFiltersPresets();
				buildFiltersFeatures();
				buildViewsColumns();
				buildViewsPresets();
					
				//set default views
				SetDefaults();

				loadCookiesAndBuildUserPresets();

				// sort columns						
				tabuTable.setSort([
					{column:"model", dir:"asc"}, //then sort by this second
					{column:"brand", dir:"asc"} //sort by this first
				]);

			}).then(() =>{
				if(toh_prefs.boot_hide){
					$('#toh-boot-overlay').slideUp(500);
				}
				
				ObserveHeaderFiltersAndInitSearch();
				PreLoadImagesCache();
			});   
		});
	});






	// Dev badge ##############################################################################################################

	$('#toh-dev-badge').on('click',function (e) {
		$('body').removeClass('branch-dev');
		$('#toh-changelog').hide();
	});






	// Header Search ##########################################################################################################

	$('#toh-search-icon I').on('click', function(e){
		$('#toh-search').toggleClass('toh-hidden');
	});

	// Function to toggle clear button visibility
	function toggleSearchClearButton(field) {
		const input=$('#toh-search-input-'+field);
		const clear=$('#toh-search-clear-'+field);
		if (input.val().length > 0) {
			clear.show();
		} else {
			clear.hide();
		}
	}

	// Clear input when clear button is clicked
	$('.toh-search-clear').on('click', function() {
		const field=$(this).parent().find('.toh-search-input').attr('data-field');
		$('#toh-search-input-'+field).val('').trigger('keyup');
		$(this).hide();
	});
	
	
	// input search on keyup
	$('.toh-search-input').on('keyup', function() {
		const field=$(this).attr('data-field');
		toggleSearchClearButton(field);

		// Clear any existing timeout
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
		}
		
		// Set new timeout
		this.timeoutId = setTimeout(() => {
			tabuTable.setHeaderFilterValue(field,$(this).val());
			tabuTable.refreshFilter();
		}, 300);

	});

	function ObserveHeaderFiltersAndInitSearch(){
		$('.toh-search-input').trigger('keyup'); // needed when manually relaoding a page that already have a search query

		$('.tabulator-col .tabulator-header-filter INPUT').bind('keyup', function() {
			const field=$(this).closest('.tabulator-col').attr('tabulator-field');
			const target=$('.toh-search-input[data-field='+field+']')
			target.val($(this).val());
			$('#toh-search').removeClass('toh-hidden');
		});
	}






	// User Presets ###########################################################################################################

	$('.toh-upresets-content').on('click','.toh-upreset-but',function(e){
		e.preventDefault();
		e.stopPropagation();
		var $preset=$(this);
		var num=$preset.attr('data-key');
		var type=$preset.attr('data-type');
		myLogFunc("Click user preset:"+type+' / '+num);
		if(e.shiftKey){
			myLogStr('save');
			var name="user"+num;

			$preset.addClass('toh-saving');

			// show popup
			var $popupDiv	=$('#toh-upreset-popup-save');
			var $input			=$popupDiv.find('INPUT');
			var $but_save		=$popupDiv.find('BUTTON');
			$input.val('');
			$popupDiv.show();
			
			// Position the popup div
			var cellOffset = $(this).offset();
			$popupDiv.css({
				top: cellOffset.top +20,
				left: cellOffset.left -90
			});
			$input.focus(); // nedd to be AFTER popup.show
			
			//set max
			var max=toh_prefs.cook_max_chars;
			$('#toh-upreset-popup-max').html(max);
			$input.attr('size',max);
		
			//clean events and exit
			function exit(){
				$input.off();
				$but_save.off();
				$popupDiv.off();
				$preset.removeClass('toh-saving');
				$popupDiv.hide();
			}

			//keyboard
			$input.on('keyup',function(e){
				var val=$input.val();
				if(e.keyCode==13){		//return
					$but_save.trigger('click');
				}
				if(e.keyCode==27){		//esc
					exit();
				}
				if(val.length > max){
					$input.val(val.substring(0, max)).shake(50,2,1);
				}
				myLogObj(e,'keyup event');
			});

			//save on click, if name not empty
			$but_save.on('click', function(e) {
				e.preventDefault();
				//e.stopPropagation();
				name=$input.val();
				if(name==''){
					$input.shake(50,4,2);
				}
				else{
					$preset.fadeOut(50).fadeIn(250);	// .shake(50,5,2);
					storePresetCookie(type,num,name);
					exit();
					$preset.html(name).removeClass('toh-used').addClass('toh-used');
					setPresetSelectedClass(type,num)
					myLogStr('saved');
				}
			});	

			// Prevent the click event from propagating to the document
			$popupDiv.on('click', function(e) {
				e.stopPropagation();
			});

		}
		else if(e.altKey){
			myLogStr('delete');
			deletePresetCookie(type,num);
			$preset.html(num).removeClass('toh-used').fadeOut(150).fadeIn(50);
			if(type=='features'&& $preset.hasClass('toh-selected')){
				setPresetSelectedClass(type,'');
			}
			if(type=='columns'&& $preset.hasClass('toh-selected')){
				setPresetSelectedClass(type,'custom');
			}
		}
		else{
			myLogStr('load');
			applyUserPreset(type,num);
			if(type=='features' && $preset.hasClass('toh-used')){
				setPresetSelectedClass(type,num);
			}
			if(type=='columns' && $preset.hasClass('toh-used')){
				setPresetSelectedClass(type,num);
			}
		}
	
	});
	// exit save preset when clicking elsewhere
	$(document).on('click', function(e){
		myLogFunc('on Click document');
		if(!$('#toh-upreset-popup-save').is(':visible')) return;
		myLogStr('Click document USED');
		$('#toh-upreset-popup-save').hide();
		$('.toh-upreset-but').removeClass('toh-saving');

	});






	// Top Filters ############################################################################################################

	//  Click: Filter Preset ------------------------------------------
	$('#toh-top-filters').on('click','.toh-filter-preset .toh-filter-button',function(e){
		myLogFunc("on Click filter preset");
		e.preventDefault();
		var key=$(this).attr('data-key');
		//setPresetSelectedClass('features',key);
		applyFilterPreset(key);
	});

	// Click: Feature CheckBox -------------------------------------------
	$('#toh-top-filters').on('click','.toh-filter-feature INPUT',function(e){
		myLogFunc("on Click checkbox feature");
		var key=$(this).attr('data-key');
		//setPresetSelectedClass('features');
		checkFeatureAndClearPreset(key, $(this).is(":checked") );
		applyCheckedFeatures();
	});

	// Click: Feature link ----------------------
	$('#toh-top-filters').on('click','.toh-filter-title A',function(e){
		e.preventDefault();
		var cb=$(this).parent().find('INPUT').trigger('click');
	});

	// Click: Replace Option immediately populates columns ----------------------
	$('#toh-filters-options INPUT[value=repl]').on('click',function(e){
		myLogFunc('on Click replace option');
		applyColumnsFromFilters();
	});






	// Top Views (columns) ####################################################################################################

	// Click: View Preset ---------------------------------------------------
	$('#toh-cols-presets').on('click','A',function(e){
		e.preventDefault();
		let view=$(this).attr('data-key');
		myLogFunc('on Click Col Preset');
		myLogStr('Apply view: '+view);
		if(view=='custom'){
			$(".toh-cols-but-toggle").trigger('click');
		}
		else{
			applyColumnPreset(view);
		}
	});

	// Click (or viewchanged): one view CheckBox ----------------------
	$('#toh-cols-columns-content').on('click viewchanged','INPUT',function(e){
		var key=$(this).attr('data-key');
		myLogFunc('on Click Checkbox Col: '+key);
		//setPresetSelectedClass('columns','custom');
		applyColumCol(key, $(this).is(":checked") );
	});

	// Click: one view link ----------------------
	$('.toh-cols-list').on('click','A',function(e){
		myLogFunc('on Click Checkbox Link');
		e.preventDefault();
		var cb=$(this).parent().find('INPUT').trigger('click');
	});

	//  Click: View Group ---------------------------------------------------
	$('#toh-cols-columns-content').on('click','.toh-viewgroup-title A',function(e){
		myLogFunc('on Click Column Preset');
		e.preventDefault();
		//e.stopPropagation();
		showLoading();
		var checked	=$(this).parents('.toh-viewgroup').find('.toh-col-column INPUT:checked').length;
		var inputs	=$(this).parents('.toh-viewgroup').find('.toh-col-column INPUT');
		if(checked==0){
			inputs.prop('checked', true).trigger('viewchanged');
		}
		else{
			inputs.prop('checked', false).trigger('viewchanged');
		}
		updateColGroupIcons();
	});





	// Top Buttons ############################################################################################################

	// -------------------------------------------
	function toggleFilterClearButVisibility(){
		myLogFunc();
		var $but_clear_filt	=$('.toh-but-clearfilters');
		var $but_clear_head	=$('.toh-but-clearheaderfilters');
		var $but_clear_all	=$('.toh-but-clearallfilters');

		var $div_filters_title	=$('#toh-filters-title');

		// filters
		var cur_filters		=tabuTable.getFilters();
		if(cur_filters.length==0){
			$but_clear_filt.hide();
			$div_filters_title.removeClass('active');
		}
		else{
			$but_clear_filt.show();
			$div_filters_title.removeClass('active').addClass('active');
		}
		// header filters
		var cur_headfilters	=tabuTable.getHeaderFilters();
		if(cur_headfilters.length==0){
			$but_clear_head.hide();
		}
		else{
			$but_clear_head.show();
		}
		// ALL filters
		if(cur_filters.length>0 && cur_headfilters.length>0 ){
			$but_clear_all.show();
		}
		else{
			$but_clear_all.hide();
		}
	}

	// -------------------------------------------
	function toggleSortClearButVisibility(){
		myLogFunc();
		var $but_clear_sort	=$('.toh-but-clearheadersorts');
		myLogObj(tabuTable.getSorters(), 'tabu Sorters');
		if(tabuTable.getSorters().length>0 ){
			$but_clear_sort.show();
		}
		else{
			$but_clear_sort.hide();
		}		
	}

	// Click: clear header sorts ----------------
	$(".toh-but-clearheadersorts").on('click', function (e) {
		myLogFunc('on Click But ClearSort');
		e.preventDefault();
		tabuTable.clearSort();
	});

	// Click: clear filters ----------------
	$(".toh-but-clearfilters").on('click', function (e) {
		myLogFunc('on Click But ClearFilters');
		e.preventDefault();
		tabuTable.clearFilter();
		checkAllFeatures(false);
		setPresetSelectedClass('features','custom');
		buildBrowserUrl();	
	});

	// Click: clear header filters ----------------
	$(".toh-but-clearheaderfilters").on('click', function (e) {
		myLogFunc('on Click But ClearHeaderFilters');
		e.preventDefault();
		tabuTable.clearHeaderFilter();
		$('.toh-search-input').val('');
		$('.toh-search-clear').hide();
	});

	// Click: clear all filters ----------------
	$(".toh-but-clearallfilters").on('click', function (e) {
		myLogFunc('on Click But ClearAllFilters');
		e.preventDefault();
		tabuTable.clearHeaderFilter();
		tabuTable.clearFilter();
		checkAllFeatures(false);
		setPresetSelectedClass('features','custom');
		buildBrowserUrl();	
	});



	// Click: Download ----------------
	$(".toh-but-download").on('click', function (e) {
		myLogFunc('on Click But Download');
		e.preventDefault();
		let type=$(this).data('dltype');
		let range=$('SELECT[name=dlrange] OPTION:selected').val();
		myLogStr(type+' / '+range);
		DownloadTable(type, range);
	});

	function DownloadTable(type, mode) {
		type = type ? type : 'csv';
		mode = mode ? mode : 'all';
		const dl_types = {
			csv: {
				ext: 'csv',
			},
			xlsx: {
				ext: 'xlsx',
			},
			json: {
				ext: 'json',
			},
		};
		const dl_modes = {
			all: {
				range: 'all',
				suffix: '_all',
			},
			active: {
				range: 'active',
				suffix: '_filtered',
			}
		};

		if (!dl_types[type] || !dl_modes[mode] ) {
			return false;
		}

		const file_name = 'OpenWrt_ToH' + dl_modes[mode].suffix + '.' + dl_types[type].ext;
		tabuTable.download(type, file_name, {}, dl_modes[mode].range);
	}

	// Header Filters #########################################################################################################

	// Set Colum Headers Color-------------------------------------------------
	function setColumHeaderColors(){
		myLogFunc();
		var allfilters	=getTableFiltersFields('all');
		var filters		=getTableFiltersFields('filters');
		var headfilters	=getTableFiltersFields('headerfilters');
		var myclass='';
		$(".tabulator-col").removeClass('toh-col-allfilter toh-col-filter toh-col-headerfilter');
		$.each(allfilters,function(i,f){
			if(filters.includes(f) && headfilters.includes(f)){
				myclass='toh-col-allfilter';
			}
			else if(filters.includes(f)){
				myclass='toh-col-filter';
			}
			else if(headfilters.includes(f)){
				myclass='toh-col-headerfilter';
			}

			if(myclass !=''){
				//myLogStr('apply header class: '+myclass+' to '+f);
				$(".tabulator-col[tabulator-field='"+f+"']").addClass(myclass);
			}			

		});
	}
	
	// Expand header-filter INPUT on focus -----------------------------------
	$('#toh-table').on('focus','.tabulator-header-filter INPUT', function() {
		var w=$(this).outerWidth();
		if (w < 50) {
			var pw=$(this)[0].style.width;
			$(this).attr('data-orig-pwidth',pw);
			$(this).css('position','absolute');
			$(this).parents('.tabulator-col').css('overflow','visible');
			$(this).animate({
				width: '100px',
			}, 100);
		}
	});

	// Restore header-filter INPUT on blur ---------------------------------
	$('#toh-table').on('blur','.tabulator-header-filter INPUT', function() {
		var pw=$(this).attr('data-orig-pwidth');
		if (pw !='' || pw > 0) {
			$(this).css('position','static');
			$(this).parents('.tabulator-col').css('overflow','hidden');
			$(this).animate({width: pw}, 100);
		}
		setColumHeaderColors();
	});





	// tabuTable events #######################################################################################################

	// Resfresh column color on header-filter INPUT' blur ---------------------------------
	tabuTable.on("dataFiltered", function(filters, rows){
		//myLogFunc('on dataFiltered Event');
		//myLogObj(getTableFiltersFields('filters'),'Filters');
		//myLogObj(tabuTable.getFilters(), 'Tabu Filters');
		applyColumnsFromFilters();
		setColumHeaderColors();
		toggleFilterClearButVisibility();
		if(toh_table_inited){
			buildBrowserUrl();
		}

	});


	// Update the counter when 'dataFiltered' event is REALLY finished --------------------
	tabuTable.on("renderComplete", function(){
		myLogStr('EVENT: table-change-complete', 4);
		UpdateCountRows();
		UpdateCountCols();
	});

	// Resfresh column color on header-filter INPUT' blur ---------------------------------
	tabuTable.on("columnVisibilityChanged", function(column, visible){
		myLogStr('EVENT: columnVisibilityChanged', 4);
		if(toh_table_inited){
			buildBrowserUrl();
		}
	});

	// Resfresh column color on header-filter INPUT' blur ---------------------------------
	tabuTable.on("dataSorted", function(sorters, rows){
		myLogStr('EVENT: dataSorted', 4);
		toggleSortClearButVisibility();
	});
	
	// Overrides Tabulator pageSizeChange ----------------------------------------------------
	var last_table_height=tabulatorOptions.rowHeight * tabulatorOptions.paginationSize;

	document.addEventListener("change", function (e) {
		if (e.target.matches(".tabulator-page-size")) {
			e.preventDefault();
			e.stopPropagation();

			myLogStr('EVENT: pageSizeChange');
			tableLoadingShow();
			const size = e.target.value; // Get the selected value from the <select> element
			const h_head = 53;
			const h_scroll = 17;
			const h_foot = 37;
			const h_line = tabulatorOptions.rowHeight;
			const height_t = h_head + h_scroll + h_foot + (h_line * size);
			const height_c = height_t + 0; //(1  for border)
			last_table_height = tabulatorOptions.rowHeight * size;
			myLogStr('Page Size: ' + size + ' -> Height: ' + height_t,4);
			myLogStr('Wanted Table Height: '+ last_table_height,4);


			if (toh_table_inited) { // we dont need it when page loads
				showLoading();
	
				setTimeout(() => {
					myLogStr('Table Set height: ' + height_c,2);
					$('#toh-table-container').height(height_c);
					//myLogStr('Tabulator Set pagesize ' + size);
					tabuTable.setPageSize(size == "true" ? true : size);
					tabuTable.setPage(1);
				}, 50);
			}
		}
	}, { capture: true });

	// tabulator bugfix -----
	tabuTable.on("pageLoaded", function(pageno){
		myLogStr('EVENT: pageLoaded: '+pageno);
		//this is needed to prevent border (rows height) being smaller (because the row height are NOT corrects)
		//ie : change page size to 100, click page2, click page1 (bug)
		const cur_table_height=$('.tabulator-table').height();
		//myLogStr('Cur Table Height: '+cur_table_height);

		if(toh_table_inited && cur_table_height < last_table_height -1 ){
			myLogStr('Tabulator REDRAW HACK - Changing Height from: '+cur_table_height+' to: '+last_table_height,1);
			tabuTable.redraw();
		}
	});


	// handles Loading icon when changing pages, pageSize -------------------------------------------------------------------
	var toh_loading_class="toh-table-loading";
	// insert spinner icon div
	tabuTable.on("tableBuilt", function(){
		myLogStr('EVENT: tableBuilt');
		$('.tabulator-paginator LABEL').before('<span class="'+toh_loading_class+'" toh-hidden"><i class="fa-solid fa-arrows-rotate fa-spin"></i> </span>');
	});	

	// Intercept click in capture phase
	document.addEventListener("click", function(e) {
		if ($(e.target).hasClass("tabulator-page")) {
			e.preventDefault();
			e.stopPropagation();
			var pageNumber = $(e.target).attr("data-page");
			myLogStr('EVENT: Page button clicked: ' + pageNumber);

			tableLoadingShow();
			//showLoading();

			// Defer setPage to allow repaint
			setTimeout(() => {
				myLogStr('Set page: ' + pageNumber);
				tabuTable.setPage(pageNumber);
			}, 50);
		}
	}, { capture: true });

	function tableLoadingShow(){
		const el = $('.'+toh_loading_class);
		if (el.length === 0) {
			return;
		}
		el.css({
			'display': 'inline-block',
			'visibility': 'visible'
		});
		el[0].offsetHeight; // Force immediate repaint
		//myLogStr('->tableLoadingShow');
	}

	function tableLoadingHide(){
		const el = $('.'+toh_loading_class);
		if (el.length === 0) {
			return;
		}
		el.css('display', 'none');
	}


});







// ############################################################################################################################
// Tabulator Callbacks function ###############################################################################################
// ############################################################################################################################


// Format Tabulator Rows -----------------------------------------------------------
function tabuRowFormatter(row){
	var data = row.getData();
	if(data.brand === "OpenWrt"){
		row.getElement().classList.add("brand-owrt");
	}
}



// Tabulator: Cell Popup Formatters ###########################################################################################
function CellPopupModel(e, cell, onRendered) {
	// Build initial popup HTML structure with brand and model title
	var data = cell.getData();
	var contents = "<div class='toh-details-border'>" +
		"<div class='toh-details-head'>" +
			"<b class='toth-details-title'>" + data.brand + " - " + data.model + "</b>" +
			"<div class='toh-details-close'><i class='fa fa-solid fa-circle-xmark'></i></div>" +
		"</div>" +
		"<div class='toh-details-content'>";

	// Map column fields to their definitions for quick lookup
	var columns = cell.getTable().getColumns();
	var columnMap = {};
	columns.forEach(col => columnMap[col.getField()] = col);

	// Iterate through column groups, excluding 'base'
	const { base, ...myColGroups } = toh_colGroups;
	$.each(myColGroups, function(key, obj) {
		var done = false;
		$.each(obj.fields, function(f, field) {
			// Get column definition and raw value
			var col = getMyColumnDefinition(field);
			var value = data[field];
			var formatter = (columnMap[field] || { getDefinition: () => col }).getDefinition().formatter || ((cell) => cell.getValue());

			// add label
			var mycol=JSON.parse(JSON.stringify(col)); //object deep copy
			if(mycol.formatterParams){
				mycol.formatterParams.label = mycol.formatterParams.ttip;
				mycol.formatterParams.short =true;
			}	

			// Apply formatter (assumes custom formatters; built-ins need lookupFormatter)
			var formattedValue = typeof formatter === "function" ?
				formatter({
					getValue: () => value,
					getField: () => field,
					getRow: () => cell.getRow(),
					getColumn: () => columnMap[field],
					getElement: () => document.createElement("div")
				}, mycol.formatterParams) :
				value;

			// Convert to string, skip if empty or null
			formattedValue = formattedValue instanceof Node ? formattedValue.outerHTML : String(formattedValue);
			
			// exclude empty fields
			if (!formattedValue || formattedValue === 'null' || formattedValue === '-' || isGenerigImage(value) ) return true;

			if (!done) {
				contents += "<div class='toh-details-group'>\n<div class='toh-details-title'>" + obj.name + "</div>\n<table class='toh-details-table'>";
				done = true;
			}
			contents += '<tr><td class="toh-details-key"><a href="#" title="'+ col.headerTooltip +'">' + col.title + "</a></td><td class='toh-details-value'>" + formattedValue + "</td></tr>";
		});
		if (done) contents += "</table>\n</div>";
	});

	contents += "</div></div><div class='toh-details-bottom'></div>";

	// Create popup element
	var popup = document.createElement("div");
	popup.className = "toh-details-container";
	popup.innerHTML = contents;
	popup.style.opacity = 0;
	
	// make left
	const windowTopPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
	let leftMargin=246;	// 46;	
	if(window.innerWidth < 500){
		 leftMargin=7;
	}
	else if (window.innerWidth < 840){
		 leftMargin=146;
	}
	var leftPosition = Math.min(leftMargin, window.innerWidth - popup.offsetWidth - 10);
	popup.style.left = leftPosition + "px";

	// Get the row element to manage its class
	var row = cell.getRow();
	var rowElement = row.getElement();

	// Position popup after rendering
	onRendered(() => {
		setTimeout(() => {
			//Add class to the row when popup is shown
			rowElement.classList.add("popup-active");
			popup.style.left = leftPosition + "px";

			popup.style.right = "auto";
			//popup.style.top = e.clientY + "px";
			popup.style.top =(windowTopPosition +20)+'px';
			popup.style.opacity = 1;

			// Close button handler
			popup.querySelector(".toh-details-close").addEventListener("click", () => {
				if (popup.parentNode) popup.parentNode.removeChild(popup);
				rowElement.classList.remove("popup-active");			});
		}, 0);
	});

	// Restore overflow when popup is removed
	var observer = new MutationObserver((mutations) => {
		if (!document.body.contains(popup)) {
			rowElement.classList.remove("popup-active");
			observer.disconnect();
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });

	return popup;
};





// Tabulator: Columns Formatters ##############################################################################################

// --------------------------------------------------------
function FormatterLink(cell, params, onRendered) {
	let		url		= params.url !=null ? params.url : cell.getValue();
	const	field	= cell.getField();
	const	row		= cell.getRow().getData();
	
	let 	device	=' ('+row.brand+' '+row.model+')';
	if(params.short){
		device='';
	}

	//specific Links
	if(field=='devicepage'){
		url= url ? toh_urls.www + url.replace(/:/g,'/') : '';
	}
	else if(field=='VIRT_hwdata'){
		const devid=cell.getRow().getData().deviceid;
		url= devid ? _maketHwDataUrl(devid) : '';
	}
	else if(field=='VIRT_firm' && !params.recursive){
		let [brand, id]	= row.deviceid.split(":");
		id 				= brand + '_' + id.split('_').slice(1).join('-');
		const target	= row.target + '/' + row.subtarget;
		if(!toh_firmwares_fetched){
			//return '<a href="#" title="Failed to fetch firmwares"><i class="fa-solid fa-warning dlerror"></i></a>';
			params.recursive=true;
			params.ttip="Failed to fetch firmwares";
			params.icon="fa-solid fa-warning dlerror";
			params.url='#';
			params.short=true;
			return FormatterLink(cell,params,onRendered);
		}
		url 		= GetFirmwareSelectUrl(id, target);
	}


	if (url && url.length > 0) {
		const prefix= params.prefix !=null ? params.prefix : '';
		const ttip = params.ttip !=null ? params.ttip+device : '';
		const label= params.label !=null ? params.label : '';
		const icon = params.icon !=null ? '<i class="fa-fw '+params.icon+'"></i> ' : '';
		return '<a href="' + prefix+url + '" target="_blank" title="'+ttip+'" class="tlink '+field+'">' + icon + label + '</a>'
	} 
	return '';
}

// --------------------------------------------------------
function FormatterLinkCommit(cell, params={}, onRendered) {
	const value = cell.getValue();
	if (value && value.length > 0) {
		var html ='';
		const label=params.label;
		const commit=value.replace(/.*?;h=/g,'');

		params.icon='fa-solid fa-code-commit';
		params.ttip='Origin Commit';
		if(label){params.label=params.ttip;}
		params.ttip +=" "+commit;
		params.url=value;
		html +=FormatterLink(cell, params, onRendered);

		html +="<span class='toh-spacer'></span>";

		params.icon='fa-brands fa-github';
		params.ttip='Github Commit';
		if(label){params.label=params.ttip;}
		params.ttip +=" "+commit;
		params.url=toh_urls.github_commit + commit;
		html +=FormatterLink(cell, params, onRendered);

		return html;
	} 
	return '';
}


// --------------------------------------------------------
function FormatterEditHwData(cell, formatterParams, onRendered) {
	var value = cell.getRow().getData().deviceid;
	var title = "Edit " + cell.getRow().getData().model;
	if (value && value.length > 0) {
		return '<a href="' + _maketHwDataUrl(value)  + '" target="_blank" title="'+title+'"><i class="fa-solid fa-pencil"></i></a>';
	} 
	return value;
}

// --------------------------------------------------------
function isGenerigImage(url){
	var tmp='';
	if (typeof url === "string"){
		tmp=url;
	}
	else if(Array.isArray(url) && url.length > 0){
		tmp=url[0];
	}
	else{
		return false;
	}

	if(tmp.match(/genericrouter1.png$/)){
		return true;
	}
	return false;
}


// --------------------------------------------------------
function FormatterImages(cell, formatterParams, onRendered) {
	var arr = cell.getValue();
	var url='';
	var out='';
	if (Array.isArray(arr) && arr.length > 0) {
		arr.forEach((value, index) => {
			if(value.match(/^http/)){
				url=value;
			}
			else{
				value=value.replace(/:/g,'/');
				url=toh_urls.media + value;
			}
			if(isGenerigImage(value)){
				out +='<a href="' + url + '" target="_blank" class="cell-image generic"><i class="fa-fw fa-regular fa-image"></i></a> ';
			}
			else{
				out +='<a href="' + url + '" target="_blank" class="cell-image"><i class="fa-fw fa-solid fa-image"></i></a> ';
			}

			// preload images --------
			//const img = new Image();
			//img.src = url;

			if (!toh_img_urls.includes(url)) {
				toh_img_urls.push(url);
			}

		});
		return out;
	} 
	return arr;
}

// --------------------------------------------------------
function FormatterCleanEmpty(cell, formatterParams, onRendered) {
	var value = cell.getValue();
	if (value && value.length > 0) {
		value=value.replace(/-/g,'');
		return value;
	} 
	return "";
}

// --------------------------------------------------------
function FormatterCleanWords(cell, formatterParams, onRendered) {
	var value = cell.getValue();
	if (value && value.length > 0) {
		value=value.replace(/more than/g,'&gt;'); // for GPIOs
		value=value.replace(/Qualcomm Atheros/g,'Atheros'); //  for CPU
		return value;
	} 
	return "";
}

// --------------------------------------------------------
function FormatterArray(cell, formatterParams, onRendered) {
	var arr = cell.getValue();
	var out='';
	var done=false;
	if (Array.isArray(arr) && arr.length > 0) {
		arr.forEach((value, index) => {
			value=value.replace(/NAND/g,' NAND'); // for Flash
			value=value.replace(/Qualcomm Atheros/g,'Atheros'); // for WLAN Hardware
			if(done){
				out +=" + ";
			}
			out +=value;
			done=true;
		});
		return out;
	}
	return arr;
}
// --------------------------------------------------------
function FormatterYesNo(cell, formatterParams, onRendered) {
	var value = cell.getValue();
	var icon='';
	if (typeof value === "string") {
		value=value.toLowerCase().trim();
	}
	if(value=='yes'){
		icon='fa-solid fa-check';
	}
	else if(value=='no'){
		icon='fa-solid fa-xmark';
	}
	else if(value=='-'){
		icon='fa-solid fa-question dash';
	}
	else if(value==''){
		icon='fa-solid fa-question empty';		
	}
	else{
		icon='fa-solid fa-question unknown';
	}
	return '<i class="'+icon+'"></i>';
}





// Tabulator: header Filters ##################################################################################################

// Defines the custom HeaderFilter for the "flashmb" column ----------------------------
function HeaderFilterFlash(cell, onRendered, success, cancel, editorParams){
	var container = document.createElement("span");

	//create and style inputs
	var minimum = document.createElement("input");
	minimum.setAttribute("type", "text");
	minimum.style.padding	= "4px";
	minimum.style.width		= "50%";
	minimum.style.boxSizing = "border-box";
	var search=minimum.cloneNode();
	
	minimum.setAttribute("placeholder", "Minimum");
	search.setAttribute("placeholder", "Search");

	minimum.value = cell.getValue();
	search.value = cell.getValue();

	function buildValues(){
		success({
			minimum:	minimum.value,
			search:		search.value,
		});
		if(minimum.value=='' && search.value==''){
			console.log('gotcha')
			// this fixes the Tabulator Bug, who never fires the 'dataFiltered' event when emptying the field
			tabuTable.setHeaderFilterValue('flashmb',null);
		}	
	}

	// events ---
	minimum.addEventListener("change",	buildValues);
	minimum.addEventListener("blur", 	buildValues);
	minimum.addEventListener("keyup",	buildValues); // for empty
	//minimum.addEventListener("input",	buildValues); // for empty
	search.addEventListener("change",	buildValues);
	search.addEventListener("blur",		buildValues);
	search.addEventListener("keyup",	buildValues); // for empty

	container.appendChild(minimum);
	container.appendChild(search);
	
	return container;
 }

// Handle custom HeaderFilter's logic for the 'flashmb' colum ---------------------------------------------
function HeaderFilterFuncFlash(headerValue, rowValue, rowData, filterParams){
	var b_minimum=true;
	var b_search=true;
	//console.log('val='+rowValue);
	var m;
	if(headerValue =='' || headerValue==null || headerValue == undefined){
		return true;
	}
	
	if(headerValue.minimum != ""){
		b_minimum =  _getFlashArrayBestValue(rowValue) >= headerValue.minimum;
	}
	if(headerValue.search != ""){
		//console.log('---row='+rowValue);
		b_search=false;
		if(Array.isArray(rowValue)){
			var reg		= new RegExp(headerValue.search,'i');
			for (const v of rowValue) {
				if(v !=null){
					//console.log('v='+v);
					m=reg.test(v);
					console.log(m);
					if(m){
						b_search=true;
						break;	
					}
				}
			};
		}
	}
	return b_minimum && b_search; //must return a boolean, true if it passes the filter.
}

// Handle custom HeaderFilter's logic for the 'RamMb' colum ---------------------------------------------
function HeaderFilterFuncRamMb(headerValue, rowValue, rowData, filterParams){
	//console.log(typeof(rowValue) + rowValue);
	if(headerValue =='' || headerValue==null || headerValue == undefined){
		return true;
	}
	var val=_getCleanNumber(rowValue,'ram');
	if(val ==''){
		return true;
	}

	// if we have something else than number, consider true;
	if(String(val).match(/[^\d]+/g)){
		return true;
	}

	return Number(val) >= Number(headerValue);
}





// Tabulator: sorts ###########################################################################################################

// custom sorter for the 'flashmb' column----------------------------------------------
function SorterFlash(a, b, aRow, bRow, column, dir, sorterParams){
	var aa=_getFlashArrayBestValue(a);
	var bb=_getFlashArrayBestValue(b);
	return aa - bb;
}

// custom sorter for the 'RamMb' column----------------------------------------------
function SorterRam(a, b, aRow, bRow, column, dir, sorterParams){
	var aa=_getCleanNumber(a,'ram');
	var bb=_getCleanNumber(b,'ram');
	return Number(aa) - Number(bb);
}





// Tabulator: helpers #########################################################################################################

// ---------------------------------------------------------------------------------------
// function cellDebug(e, cell){
// 	console.log(cell);
// 	console.log(cell._cell.value);
// }

// --------------------------------------------------------
function _maketHwDataUrl(deviceid){
	const [brand, model] = deviceid.split(":");
	return toh_urls.hwdata + brand + '/' + model;
}

// get the best value to use in sort/filter of the 'flashmb' column ----------------------
function _getFlashArrayBestValue(arr){
	// ignore these, just in case (because JS is SOOOOOOO sensitive)
	if(arr == null){
		return '';
	}
	if( typeof(arr) !="object" ){
		return arr;
	}

	var target=0;	
	// now we can walk into the array of values, without throwing a fatal error (did I ever said I love JS ?) .....
	arr.forEach((v) => {
		// 'microSD' or 'SD' means(?) we have Gigas available, so we rank as 128G
		if(v.match(/microsd/i) || v.match(/^SD$/)){
			//console.log('SD found in :'+v);
			v=128*1024;
		}
		// eMMC size is unknown, but if it is alone, it maybe(?) means at least 1M(?)
		else if(v.match(/eMMC/i) && arr.length==1){
			v=1;
		}
		// else we bet on the higher array.member value. (We only keep the number, ignoring letters)
		else{
			v=v.replace(/[^\d]+/g,'');
			v=Number(v);
		}
		// target is the highest found value
		if(v > target){
			target=v;
		}
	});
	return target;
}

// create the 'flash>=' filter operator ----------------------------------------------
Tabulator.extendModule("filter", "filters", {
	"flash>=":function(filtValue, rowValue, rowData, filterParams){
		//console.log('-----');
		//console.log('filtValue='+filtValue+'	| rowValue='+rowValue);
		return _getFlashArrayBestValue(rowValue) >= filtValue ? true : false;
	}
});


// get a clean number from a string column----------------------------------------------
function _getCleanNumber(rowValue,type=''){
	if(rowValue ==null){
		return '';
	}
	rowValue=rowValue.trim();
	if(rowValue==''){
		return '';
	}

	// if we have a sring like "64, 128, 256",  we keep the max
	if(rowValue.match(/,/i)){
		rowValue= rowValue.replace(/ /g,'');
		const numbers = rowValue.split(',').map(Number);
  		rowValue= Math.max(...numbers);
	}

	// specific to Ram column
	if(type=='ram'){
		if(String(rowValue).match(/[^\d]+/g)){
			//remove letter at start
			rowValue=rowValue.replace(/.*?(\d+)/g,'$1');
			// do we have GB ?
			if(rowValue.match(/[\d]+\s*GB/i)){
				rowValue=rowValue.replace(/[^\d]+/g,'');
				rowValue=Number(rowValue) * 1024 +1; //we add 1 to be sorted , ie for 4GB, just after 4096
			}
		}
	}

	// if we have letters, dont cast to number
	if(String(rowValue).match(/[^\d]+/g)){
		return rowValue;
	}
	else{
		return Number(rowValue);
	}
}


