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
// toh_filters.js
//
//	The filter rail: building it, applying it, counting it, and the
//	advanced search form that drives the same checkboxes.

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
	html +='">';
	if(is_feature){
		html +='<span class="toh-filter-label">'+filt.title+'</span>';
		// how many devices this would match; filled in by tohShowFilterCounts()
		html +='<span class="toh-filter-count"></span>';
	}
	else{
		// A preset title like "More, AC, Gbit, Avail." means nothing on first
		// sight, so the description it already carries goes underneath it.
		html +='<span class="toh-filter-lines">';
		html +='<span class="toh-filter-label">'+filt.title+'</span>';
		html +='<span class="toh-filter-sub">'+filt.description+'</span>';
		html +='</span>';
	}
	html +='</a></span>';
	html +='<span class="toh-filter-description">'+filt.description+'</span>';
	html +="</div>\n";
	return html;
}

// display Filters Presets ------------------------------------------------
function buildFiltersPresets(){
	let tmp_html='';
	for (const key in toh_filterPresets){
		tmp_html+=htmlFilterDiv(toh_filterPresets[key],key);
	}
	$('#toh-filters-presets .toh-filters-list').html(tmp_html);
}

// display Filters Features ------------------------------------------------
function buildFiltersFeatures(){
	let tmp_html='';
	let index=0;
	let hidden=0;
	for (const group in toh_filterGroups){
		tmp_html +=htmlGroup(toh_filterGroups[group].title,group,'filt',index);
		toh_filterGroups[group].members.forEach(filt => {
			tmp_html +=htmlFilterDiv(toh_filterFeatures[filt],filt,true);
		});
		tmp_html +="</ul>\n</div>\n";
		if(index >= toh_filters_visible_groups){
			hidden +=toh_filterGroups[group].members.length;
		}
		index++;
	}
	if(hidden > 0){
		tmp_html +='<a href="#" class="toh-filters-more">'
			+ tohIcon('chevron-down')
			+ '<span class="toh-filters-more-show">Show ' + hidden + ' more filters</span>'
			+ '<span class="toh-filters-more-hide">Show fewer filters</span>'
			+ '</a>';
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
	var filters;
	if(type=='filters'){
		filters	=tabuTable.getFilters();
	}
	else if(type=='headerfilters'){
		filters	=tabuTable.getHeaderFilters();
	}
	else{ // all
		filters	=tabuTable.getFilters(true);
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

		// A preset takes ownership of the query, so the thresholds a previous
		// Advanced Search left behind go with it. Without this they stayed armed
		// invisibly and reappeared on the next unrelated rail click.
		tohResetThresholds();

		tabuTable.clearFilter();			// needed?
		// tohFavWrapFilters + tohFavGrouping, exactly as applyCheckedFeatures does
		// them: setting the raw list dropped pinned favourites out of the result
		// while the pin stayed lit and the header still claimed to be showing them.
		tabuTable.setFilter(tohFavWrapFilters(set.filters));
		tohFavGrouping();

		myLogObj(tabuTable.getFilters(),'Tabu Filters (after)');

		checkAllFeatures(false);
		if(set.features.length > 0 ){		
			$.each(set.features,function(j,feat){
				checkFeature(feat);
			});	
		}
		// the boxes are ticked, but nothing had told the rail to redraw, so a
		// preset appeared to do nothing to the filters on the left
		updateFilterGroupState(true);
	}
}

// Forget every numeric threshold ------------------------------------------
// Two variables hold one idea: toh_extra_filters is what the table applies and
// toh_adv_nums is what the Advanced Search form shows. Clearing one and not the
// other left the panel reopening with a threshold it was still applying, or
// applying one it no longer displayed.
function tohResetThresholds(){
	toh_extra_filters=[];
	if(typeof toh_adv_nums !== 'undefined'){
		for(const k in toh_adv_nums){
			delete toh_adv_nums[k];
		}
	}
}

// Clicking the preset that is already on turns it back off -----------------
function tohClearFilterPreset(){
	myLogFunc();
	setPresetSelectedClass('features','custom');
	checkAllFeatures(false);
	tohResetThresholds();
	tabuTable.clearFilter();
	updateFilterGroupState();
	buildBrowserUrl();
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
	// thresholds set in advanced search ride along with the checked features
	toh_extra_filters.forEach(f => filters.push(f));

	showLoading();
	filters=reorderFilters(filters); // certainly not needed, but eases debug
	tabuTable.setFilter(tohFavWrapFilters(filters));
	tohFavGrouping();
	updateFilterGroupState(true);	// open whichever groups ended up active
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
	var set;
	if(type=='preset' && key in toh_filterPresets){
		set=JSON.parse(JSON.stringify(toh_filterPresets[key])); // makes a clone
	}
	else if(type=='feature' && key in toh_filterFeatures){
		set=JSON.parse(JSON.stringify(toh_filterFeatures[key])); // makes a clone
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


// Filter counts ##############################################################################################################
// How many devices each feature filter would match, shown next to it in the
// rail. Tabulator's own engine costs ~33ms per pass, so 43 features would mean
// a second and a half of redraws; these mirror its comparison semantics
// instead. tools/verify-filter-counts.mjs checks the two agree exactly.

function _matchOne(row, filt){
	const rowVal=row[filt.field];
	const filtVal=filt.value;

	switch(filt.type){
		case '=':	return rowVal == filtVal;
		case '!=':	return rowVal != filtVal;
		case '>':	return rowVal > filtVal;
		case '>=':	return rowVal >= filtVal;
		case '<':	return rowVal < filtVal;
		case '<=':	return rowVal <= filtVal;

		// the three custom operators registered on Tabulator, mirrored so the rail
		// counts and the table agree about the same row
		case 'min>=': {
			const n=tohCountOf(rowVal);
			return n !== null && n >= Number(filtVal);
		}
		case 'ram>=': {
			const n=_getCleanNumber(rowVal, 'ram');
			return typeof n === 'number' && !isNaN(n) && n >= Number(filtVal);
		}
		case 'flash>=':
			return _getFlashArrayBestValue(rowVal) >= filtVal;

		case 'like':
			if(filtVal === null || filtVal === undefined){
				return rowVal === filtVal;
			}
			if(rowVal === null || rowVal === undefined){
				return false;
			}
			return String(rowVal).toLowerCase().indexOf(String(filtVal).toLowerCase()) > -1;

		case 'keywords': {
			// Tabulator matches ANY keyword unless filterParams.matchAll is set,
			// which is easy to get backwards: "available unknown" is meant to
			// catch either word, not both
			const params=filt.filterParams || {};
			const sep=params.separator === undefined ? ' ' : params.separator;
			const keywords=String(filtVal).toLowerCase().split(sep).filter(Boolean);
			const hay=String(rowVal === null || rowVal === undefined ? '' : rowVal).toLowerCase();
			const hits=keywords.filter(k => hay.indexOf(k) > -1).length;
			return params.matchAll ? hits === keywords.length : hits > 0;
		}

		case 'regex':
			return (typeof filtVal === 'string' ? new RegExp(filtVal) : filtVal).test(rowVal);

		case 'flash>=':
			return _getFlashArrayBestValue(rowVal) >= filtVal;
	}
	return true;			// an operator we do not model must not silently exclude rows
}

// A feature's filter list: top level is AND, a nested array is OR ----------
function tohMatchFeature(row, filters){
	return filters.every(f => Array.isArray(f) ? f.some(o => _matchOne(row,o)) : _matchOne(row,f));
}

// Count every feature once, against the whole dataset ---------------------
function tohCountFeatures(){
	myLogFunc();
	const rows=tohRows();
	// One walk over the rows testing all 43 features, rather than 43 walks
	// testing one. Same predicates and the same number of calls, but the row it
	// is working on stays in cache instead of the whole array being streamed
	// through 43 times.
	const keys=Object.keys(toh_filterFeatures);
	const filters=keys.map(k => toh_filterFeatures[k].filters);
	const counts={};
	const n=new Int32Array(keys.length);
	for(let i=0;i<rows.length;i++){
		const row=rows[i];
		for(let f=0;f<keys.length;f++){
			if(tohMatchFeature(row, filters[f])){ n[f]++; }
		}
	}
	keys.forEach((k, f) => { counts[k]=n[f]; });
	return counts;
}

// Write the counts into the rail ------------------------------------------
function tohShowFilterCounts(){
	const counts=tohCountFeatures();
	$('.toh-filter-feature').each(function(){
		const key=$(this).find('INPUT').attr('data-key');
		if(counts[key] !== undefined){
			$(this).find('.toh-filter-count').text(counts[key].toLocaleString('en-US'));
		}
	});
}


// Advanced search ############################################################################################################
// One form over the criteria people actually combine, with the result count
// updating as you go. It drives the same feature checkboxes as the rail, so
// there is only ever one set of active filters - plus two numeric thresholds
// the fixed presets cannot express.

const toh_advsearch=[
	{group:'Network',	features:['eth_1g','eth_2d5g','eth_10g','port_sfp','vlan']},
	{group:'Wireless',	features:['wifi_n','wifi_ac','wifi_ax','wifi_be','antennas']},
	{group:'Ports',		features:['port_usb','port_sata','port_audio','port_video','gpio']},
	{group:'Features',	features:['bluetooth','modem_cellular','modem_dsl','outdoor','power_poe']},
	{group:'Type',		features:['type_wifirouter','type_wifiap','type_travel','type_board','type_switch']},
	{group:'Status',	features:['available']},
];

// thresholds the presets cannot express
const toh_advsearch_nums=[
	{key:'ram',   field:'rammb',  label:'RAM at least',   unit:'MB', steps:[32,64,128,256,512,1024]},
	{key:'flash', field:'flashmb',label:'Flash at least', unit:'MB', steps:[8,16,32,64,128,256], type:'flash>='},
];

let toh_adv_nums={};				// {ram: 128, flash: 16}
let toh_extra_filters=[];			// numeric thresholds, applied alongside the checked features

// Build the form ------------------------------------------------------------
function tohBuildAdvSearch(){
	let html='';

	toh_advsearch.forEach(section => {
		const items=section.features.filter(k => toh_filterFeatures[k]);
		if(!items.length){
			return;
		}
		html +='<div class="toh-adv-group"><h3>' + section.group + '</h3><div class="toh-adv-items">';
		const on=getCheckedFeatures();
		items.forEach(key => {
			const f=toh_filterFeatures[key];
			html +='<label class="toh-adv-item" title="' + tohAttr(makeFeatureDescription(key)) + '">'
				+ '<input type="checkbox" class="toh-adv-check" data-key="' + key + '"'
					+ (on.indexOf(key) > -1 ? ' checked' : '') + '>'
				+ '<span class="toh-adv-item-label">' + f.title + '</span>'
				+ '<span class="toh-adv-item-count" data-key="' + key + '"></span>'
				+ '</label>';
		});
		html +='</div></div>';
	});

	html +='<div class="toh-adv-group"><h3>Memory</h3><div class="toh-adv-nums">';
	toh_advsearch_nums.forEach(n => {
		html +='<label class="toh-adv-num"><span>' + n.label + '</span><select class="toh-adv-select" data-key="' + n.key + '">'
			+ '<option value="">Any</option>';
		n.steps.forEach(v => {
			// the stored value is applied whether or not the form shows it, so a
			// select reading "Any" next to a count computed with RAM >= 512 was
			// the panel disagreeing with itself
			html +='<option value="' + v + '"' + (toh_adv_nums[n.key] === v ? ' selected' : '')
				+ '>' + v + ' ' + n.unit + '</option>';
		});
		html +='</select></label>';
	});
	html +='</div></div>';

	$('#toh-adv-body').html(html);
	tohAdvSync();
}

// The features the form does not expose but Apply keeps -------------------
// One definition, shared by the count and by Apply. They used to disagree: the
// form shows 26 of the 43 features and Apply deliberately preserves the other
// 17, so a count that ignored them described a query Apply would never run.
function tohAdvKeptFeatures(){
	const exposed=new Set();
	toh_advsearch.forEach(section => section.features.forEach(k => exposed.add(k)));
	return getCheckedFeatures().filter(k => !exposed.has(k));
}

// The rows the panel should be counting over ------------------------------
// The header filters - the hero search and any column filter - are a separate
// axis the panel cannot change, so they narrow what Apply will produce without
// appearing anywhere in the panel's own filter list. Counting over all 3,015
// rows is what made the headline offer 19 devices above a 57-row table and then
// deliver none of them.
function tohAdvBaseRows(){
	const rows=tohRows();
	let active=[];
	try { active=tabuTable.getHeaderFilters() || []; } catch(e) { active=[]; }
	if(!active.length){
		return rows;
	}
	return rows.filter(row => active.every(hf => {
		const col=toh_colStyles[hf.field] || {};
		const val=row[hf.field];
		if(typeof col.headerFilterFunc === 'function'){
			return col.headerFilterFunc(hf.value, val, row, col.headerFilterFuncParams || {});
		}
		return String(val === null || val === undefined ? '' : val)
			.toLowerCase().indexOf(String(hf.value).toLowerCase()) > -1;
	}));
}

// Everything the form currently asks for, as a filter list -----------------
function tohAdvFilters(){
	const filters=[];
	tohAdvKeptFeatures().forEach(key => {
		toh_filterFeatures[key].filters.forEach(f => filters.push(f));
	});
	$('#toh-adv-body .toh-adv-check:checked').each(function(){
		const key=$(this).attr('data-key');
		toh_filterFeatures[key].filters.forEach(f => filters.push(f));
	});
	toh_advsearch_nums.forEach(n => {
		const v=toh_adv_nums[n.key];
		if(v){
			filters.push({field:n.field, type:n.type || '>=', value:v});
		}
	});
	return filters;
}

// Live count, and per-criterion counts within the current selection --------
function tohAdvSync(){
	const rows=tohAdvBaseRows();
	const chosen=tohAdvFilters();
	const matching=rows.filter(r => tohMatchFeature(r, chosen));
	$('#toh-adv-count').text(matching.length.toLocaleString('en-US'));
	$('#toh-adv-apply').prop('disabled', matching.length === 0);

	// what each unchecked criterion would still leave you, given the rest
	$('#toh-adv-body .toh-adv-item').each(function(){
		const $cb=$(this).find('.toh-adv-check');
		const key=$cb.attr('data-key');
		let n;
		if($cb.is(':checked')){
			n=matching.length;
		}
		else {
			const extra=chosen.concat(toh_filterFeatures[key].filters);
			n=rows.filter(r => tohMatchFeature(r, extra)).length;
		}
		$(this).toggleClass('is-dead', n === 0);
		$(this).find('.toh-adv-item-count').text(n.toLocaleString('en-US'));
	});
}

// Push the form's selection into the rail and the table --------------------
function tohAdvApply(){
	const keys=[];
	$('#toh-adv-body .toh-adv-check:checked').each(function(){
		keys.push($(this).attr('data-key'));
	});

	// The form shows 26 of the 43 features; the wizard and the shortlists set
	// several of the other 17. Clearing the rail and replaying only what the
	// form knows about therefore threw away filters the visitor could not see
	// and had no way to notice were gone, so keep the unrepresented ones.
	const keep=tohAdvKeptFeatures();

	checkAllFeatures(false);
	// kept first, form second: checkFeature() unticks siblings that share a
	// data-only group, and the form's answer should win any collision
	keep.forEach(k => checkFeature(k, true));
	keys.forEach(k => checkFeature(k, true));
	setPresetSelectedClass('features','custom');

	tohResetThresholds();
	toh_advsearch_nums.forEach(n => {
		const v=toh_adv_nums[n.key];
		if(v){
			toh_extra_filters.push({field:n.field, type:n.type || '>=', value:v});
		}
	});

	applyCheckedFeatures();
	updateFilterGroupState(true);
	tohCloseAdvSearch();
}

function tohOpenAdvSearch(){
	tohBuildAdvSearch();
	$('#toh-adv-panel').removeClass('toh-hidden');
	tohSetPanelHidden('#toh-adv-panel', false);
	$('#toh-main, #toh-compare-panel, #toh-facet-panel').addClass('toh-hidden');
	tohScrollTop();
}

function tohCloseAdvSearch(){
	$('#toh-adv-panel').addClass('toh-hidden');
	tohSetPanelHidden('#toh-adv-panel', true);
	$('#toh-main').removeClass('toh-hidden');
}


// Configurator ###############################################################################################################
// Not a second filtering engine - a different way in. Each answer maps to the
// same feature keys the rail and advanced search use, so what comes out is an
// ordinary filtered table you can then refine by hand.

const toh_wizard=[
	{
		key:'wan',
		question:'How fast is your internet?',
		hint:'This decides the WAN port you need.',
		options:[
			{label:'Up to 100 Mbps',	features:[]},
			{label:'Up to 1 Gbps',		features:['eth_1g']},
			{label:'Faster than 1 Gbps',features:['eth_2d5g']},
		],
	},
	{
		key:'wifi',
		question:'Which Wi-Fi do you want?',
		hint:'Newer generations need newer, usually pricier, hardware.',
		options:[
			{label:'Any',			features:[]},
			{label:'Wi-Fi 5 or newer',	features:['wifi_ac']},
			{label:'Wi-Fi 6 or newer',	features:['wifi_ax']},
			{label:'Wi-Fi 7',			features:['wifi_be']},
		],
	},
	{
		key:'usb',
		question:'Do you need a USB port?',
		hint:'For a printer, a disk or a cellular modem.',
		options:[
			{label:'No',			features:[]},
			{label:'Yes',			features:['port_usb']},
		],
	},
	{
		key:'sold',
		question:'Does it have to be on sale now?',
		hint:'Second-hand hardware is often the better value, if you do not mind hunting.',
		options:[
			{label:'It can be discontinued',	features:[]},
			{label:'Still sold',				features:['available']},
		],
	},
	{
		key:'memory',
		question:'How much room for packages?',
		hint:'More flash means more you can install beyond the base system.',
		options:[
			{label:'Whatever fits',	features:[]},
			{label:'Comfortable',	features:['memory_more']},
			{label:'Plenty',		features:['memory_comfort']},
		],
	},
];

let toh_wizard_at=0;				// which question we are on
let toh_wizard_answers={};			// {stepKey: optionIndex}

// The features every answer so far adds up to ------------------------------
function tohWizardFeatures(){
	const keys=[];
	toh_wizard.forEach(step => {
		const at=toh_wizard_answers[step.key];
		if(at === undefined){
			return;
		}
		step.options[at].features.forEach(f => keys.push(f));
	});
	return keys;
}

function tohWizardCount(keys){
	const filters=[];
	keys.forEach(k => {
		if(toh_filterFeatures[k]){
			toh_filterFeatures[k].filters.forEach(f => filters.push(f));
		}
	});
	// same base as the advanced search: the hero search narrows what Apply will
	// produce, so a count taken over all 3,015 rows promises what it cannot give
	return tohAdvBaseRows().filter(r => tohMatchFeature(r, filters)).length;
}

function tohBuildWizard(){
	const step=toh_wizard[toh_wizard_at];
	const chosen=tohWizardFeatures();

	let html='<div class="toh-wiz-progress">';
	toh_wizard.forEach((s,i) => {
		html +='<span class="toh-wiz-dot' + (i === toh_wizard_at ? ' is-now' : (toh_wizard_answers[s.key] !== undefined ? ' is-done' : '')) + '"></span>';
	});
	html +='</div>';

	html +='<div class="toh-wiz-step">';
	html +='<h3>' + step.question + '</h3>';
	html +='<p class="toh-wiz-hint">' + step.hint + '</p>';
	html +='<div class="toh-wiz-options">';

	step.options.forEach((opt,i) => {
		// what picking this would leave, given everything answered so far
		const trial=chosen.filter(k => !(step.options[toh_wizard_answers[step.key]] || {features:[]}).features.includes(k)).concat(opt.features);
		const n=tohWizardCount(trial);
		const on=toh_wizard_answers[step.key] === i;
		html +='<a href="#" class="toh-wiz-option' + (on ? ' is-on' : '') + (n === 0 ? ' is-dead' : '') + '" data-index="' + i + '">'
			+ '<span class="toh-wiz-option-label">' + opt.label + '</span>'
			+ '<span class="toh-wiz-option-count">' + n.toLocaleString('en-US') + '</span>'
			+ '</a>';
	});
	html +='</div></div>';

	$('#toh-wiz-body').html(html);
	$('#toh-wiz-count').text(tohWizardCount(chosen).toLocaleString('en-US'));
	$('#toh-wiz-back').prop('disabled', toh_wizard_at === 0);
	$('#toh-wiz-next').text(toh_wizard_at === toh_wizard.length - 1 ? 'Show results' : 'Next');
	$('#toh-wiz-stepno').text('Question ' + (toh_wizard_at + 1) + ' of ' + toh_wizard.length);
}

function tohWizardApply(){
	const keys=tohWizardFeatures();
	checkAllFeatures(false);
	keys.forEach(k => checkFeature(k, true));
	setPresetSelectedClass('features','custom');
	tohResetThresholds();
	applyCheckedFeatures();
	updateFilterGroupState(true);
	tohCloseWizard();
}

function tohOpenWizard(){
	toh_wizard_at=0;
	toh_wizard_answers={};
	tohBuildWizard();
	$('#toh-wiz-panel').removeClass('toh-hidden');
	tohSetPanelHidden('#toh-wiz-panel', false);
	$('#toh-main, #toh-compare-panel, #toh-facet-panel, #toh-adv-panel').addClass('toh-hidden');
	tohScrollTop();
}

function tohCloseWizard(){
	$('#toh-wiz-panel').addClass('toh-hidden');
	tohSetPanelHidden('#toh-wiz-panel', true);
	$('#toh-main').removeClass('toh-hidden');
}


// Collections ################################################################################################################
// Named starting points, built from the same feature keys as everything else.
// Nothing is stored for these: each one is just a list of filters with a name.

const toh_collections=[
	{title:'Travel routers',	hint:'Small, mains or USB powered',		features:['type_travel','available']},
	{title:'Wi-Fi 7',			hint:'The newest wireless generation',	features:['wifi_be']},
	{title:'Wi-Fi 6 and 6E',	hint:'Still current, far more choice',	features:['wifi_ax','available']},
	{title:'2.5G and faster',	hint:'For internet past a gigabit',		features:['eth_2d5g']},
	{title:'Single board computers',hint:'Boards, not finished routers',	features:['type_board']},
	{title:'Cellular modems',	hint:'With a cellular modem',			features:['modem_cellular']},
	{title:'Room for packages',	hint:'Comfortable flash and RAM',		features:['memory_comfort','available']},
	{title:'PoE capable',		hint:'Powered over ethernet',			features:['power_poe']},
	{title:'Still sold',		hint:'Available new',					features:['available']},
];

// Which shortlist, if any, the rail is currently set to. Derived from the
// checkboxes rather than remembered, so unticking one feature by hand drops the
// highlight on its own and there is no second copy of the state to go stale.
function tohActiveCollection(){
	const now=getCheckedFeatures().slice().sort().join('|');
	if(now === ''){
		return null;
	}
	for(let i=0; i<toh_collections.length; i++){
		if(toh_collections[i].features.slice().sort().join('|') === now){
			return i;
		}
	}
	return null;
}

// Paint the highlight. Called from updateFilterGroupState, so every route that
// changes the filters keeps it honest.
function tohMarkActiveCollection(){
	const on=tohActiveCollection();
	$('#toh-collections-list .toh-collection').each(function(){
		$(this).toggleClass('is-on', Number($(this).attr('data-index')) === on);
	});
}

function tohBuildCollections(){
	const rows=tohRows();
	let html='';

	toh_collections.forEach((c,i) => {
		const filters=[];
		c.features.forEach(k => {
			if(toh_filterFeatures[k]){
				toh_filterFeatures[k].filters.forEach(f => filters.push(f));
			}
		});
		const n=rows.filter(r => tohMatchFeature(r, filters)).length;
		if(n === 0){
			return;					// a collection nobody matches is not worth offering
		}
		html +='<a href="#" class="toh-collection" data-index="' + i + '">'
			+ '<span class="toh-collection-title">' + c.title + '</span>'
			+ '<span class="toh-collection-hint">' + c.hint + '</span>'
			+ '<span class="toh-collection-count">' + n.toLocaleString('en-US') + ' devices</span>'
			+ '</a>';
	});

	$('#toh-collections-list').html(html);
	$('#toh-collections').toggleClass('toh-hidden', html === '');
	tohMarkActiveCollection();
}

function tohApplyCollection(index){
	const c=toh_collections[index];
	if(!c){
		return;
	}
	// clicking the one that is already on turns it back off, the same way the
	// presets in the rail do
	if(tohActiveCollection() === index){
		checkAllFeatures(false);
		setPresetSelectedClass('features','custom');
		tohResetThresholds();
		tabuTable.clearFilter();
		updateFilterGroupState();
		buildBrowserUrl();
		tohBackToTable();
		return;
	}
	checkAllFeatures(false);
	c.features.forEach(k => checkFeature(k, true));
	setPresetSelectedClass('features','custom');
	tohResetThresholds();
	applyCheckedFeatures();
	updateFilterGroupState(true);
	// land on the result. Picking a shortlist from, say, the statistics page
	// used to filter the table behind whatever panel you were looking at.
	tohBackToTable();
	tohScrollTop();
}
