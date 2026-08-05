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
// toh_views.js
//
//	The column picker: which columns are shown, presets, and the
//	user-saved column sets.

// Views functions ############################################################################################################

// Make a column line -------------------------------------------
function htmlColumnLine(field,col,checked){
	let html='';
	let tip		=col.headerTooltip;
	if(tip==true){tip='';}		// auto columns carry `true`, not a string

	// The full name, not the column header. "S.Release" and "Pkg Arch" are
	// abbreviated to fit a 60px column; this is a one-per-line list with room to
	// spare, and a name nobody can decode is a column nobody will tick. The
	// header's short form goes in the tooltip instead, so the two can still be
	// matched up.
	//
	// pickerLabel covers the few columns whose tooltip is an instruction rather
	// than a name - "Keep an eye on this device" reads oddly next to a checkbox.
	const label	=col.pickerLabel || tip || col.title;
	const alt	=tip && col.title && tip !== col.title ? col.title : field;

	html +='<div class="toh-col toh-col-column">';
	html +='<input type="checkbox" data-key="'+field+'"';
	if( checked ){html +=' checked="true"';}
	html +='> <a href="#" title="'+tohAttr(alt)+'">'+label+"</a>\n";
	html +="</div>";
	return html;
}

// Make a column Group  ------------------------------------------
// 'index' is the group's position, used to decide what starts hidden behind
// the "Show more filters" toggle.
function htmlGroup(title,group,type,index=0){
	let html='';
	let names={
		view: 'toh-viewgroup',
		filt: 'toh-filtgroup',
	};
	let icons={
		view: 'square',			// swapped for the tri-state box by updateColGroupIcons()
		filt: 'filter',
	};
	let ttip={
		view: 'Toggle group visibility',
		filt: '',
	};
	// filter groups carry their own icon (Wi-Fi, memory, ports, ...)
	let icon=icons[type];
	let extra='';
	if(type=='filt'){
		if(toh_filterGroups[group] && toh_filterGroups[group].icon){
			icon=toh_filterGroups[group].icon;
		}
		// 40-odd rows at once make the rail far too long to scan, so everything
		// past the first few groups hides behind "Show more filters"
		if(index >= toh_filters_visible_groups){
			extra=' toh-filtgroup-extra';
		}
	}
	html +='<div class="toh-group '+names[type]+extra+'" data-group="'+group+'">'+"\n"+'<div class="toh-group-title '+names[type]+'-title"><a href="#" class="view-link" title="'+ttip[type]+'">'+tohIcon(icon)+' '+title+'<span class="toh-filtgroup-count"></span></a></div>'+"\n";
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
			// These have no entry in toh_colStyles, so headerTooltip is Tabulator's
			// own `true` rather than a name. Concatenating onto that produced the
			// string "true (fieldname)", which used to hide in a tooltip and would
			// now be the visible label.
			var known=(typeof def.headerTooltip === 'string' && def.headerTooltip !== '')
				? def.headerTooltip : def.title;
			def={...def, headerTooltip: known + ' (' + arr.field + ')'};
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
	// Tick first. showColumn/hideColumn fire columnVisibilityChanged, which
	// rebuilds the URL from the checkboxes - doing it the other way round meant
	// the last column of a saved set never reached ?columns=, and the
	// "only filtered" option wrote no ?columns= at all.
	checkColumn(col,state);
	if(state){
		tabuTable.showColumn(col);
	}
	else{
		tabuTable.hideColumn(col);
	}
	UpdateCountCols();
}

//  Show and Check Persistent Columns ------------------------------
// Only the Device column is truly persistent. Not 'brand' (Device carries it)
// and no longer 'VIRT_edit' (a maintainer action, no longer in the default
// view) - forcing either back on here undid the visitor's choice every time
// the filters rewrote the columns.
function showAndCheckPersistentColumns(){
	showAndCheckColumn('model');
}

// Show or Hide ALL columns --------------------------------------
// One blocked pass. Each show/hide re-lays out the whole table on its own, so
// walking 80 columns individually meant 80 relayouts to reach one state, and
// most of them were no-ops toggling a column to what it already was.
function showAllColumns(bool) {
	myLogFunc();
	tabuTable.blockRedraw();
	try {
		tabuTable.getColumns().forEach(function(col){
			const field=col.getField();
			if(!field || col.isVisible() === bool){
				return;
			}
			if(bool){ col.show(); } else { col.hide(); }
		});
	}
	finally {
		tabuTable.restoreRedraw();		// an exception here would freeze the table
	}
	UpdateCountCols();
}

// Make exactly these fields the visible columns ------------------
// The preset path used to hide all 80 and then show 11 back, one call each,
// with a column count and a jQuery selector per column on top. This is the
// same end state in one pass, touching only what actually changes.
function applyColumnSet(fields){
	myLogFunc();
	const want=new Set(fields);
	tabuTable.blockRedraw();
	try {
		tabuTable.getColumns().forEach(function(col){
			const field=col.getField();
			if(!field){
				return;
			}
			const on=want.has(field);
			if(col.isVisible() !== on){
				if(on){ col.show(); } else { col.hide(); }
			}
		});
	}
	finally {
		tabuTable.restoreRedraw();
	}
	$('.toh-col-column INPUT').each(function(){
		$(this).prop('checked', want.has($(this).attr('data-key')));
	});
	updateColGroupIcons();
	UpdateCountCols();
	relayoutColumns();
}

// Apply a View Preset : show/hide columns -----------------------
function applyColumnPreset(key){
	myLogFunc();
	toh_current_view=key;
	showLoading();
	setTimeout(function(){
		let set;
		if(key=='all'){
			set=tabuTable.getColumns().map(c => c.getField()).filter(Boolean);
		}
		else if(key=='none'){
			set=[];
		}
		else{
			set=getColumnSet(key);
			if(set.length === 0){
				return;					// not a preset we know; leave the columns alone
			}
		}
		setPresetSelectedClass('columns',key);
		applyColumnSet(set);
	},0);
}

// Re-run the column layout ------------------------------------
// showColumn()/hideColumn() move columns in and out without re-running it, so
// a preset that fits the viewport would otherwise leave the leftover width as
// dead grey space instead of handing it to the last column.
function relayoutColumns(){
	tabuTable.redraw(true);
}

// Apply a (single) Column : show/hide -----------------------
function applyColumCol(key,state){
	myLogFunc();
	toh_current_view=null;			// one column toggled is no longer a named view
	toh_view_chosen=true;			// ... and resizing must not take it back
	setPresetSelectedClass('columns','custom');
	showAndCheckColumn(key,state);
	relayoutColumns();
}

// get filters array (also merge features filters for Presets)--------------------------
function getColumnSet(key){
	myLogFunc();
	let set=[];
	if(key=='all'){
		// toh_colPresets maps a name to an ARRAY of fields, so pushing the value
		// built a list of lists. It went unnoticed because applyColumnPreset()
		// short-circuits 'all' and the other two callers only read .length,
		// where an array of arrays is accidentally truthy.
		$.each(toh_colPresets,function(k,fields){
			fields.forEach(function(field){
				if(!set.includes(field)){
					set.push(field);
				}
			});
		});
	}
	else if (key=='none'){
		set=[];
	}
	else if(typeof(toh_colPresets[key]) !='undefined'){
		set=toh_colPresets[key].slice();	// a copy: the preset is shared config
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
		if(opt=='add' || opt=='repl'){
			toh_current_view=null;	// the filters chose these columns, not a preset
			toh_view_chosen=true;
		}
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
		if(opt=='add' || opt=='repl'){
			relayoutColumns();
		}
	},0);
}

// Badge each group with how many of its filters are on ---------------------
// If an active filter sits in a group that is hidden behind "Show more
// filters", reveal the rest so it is never silently applied out of sight.
function updateFilterGroupState(reveal_active=false){
	// the row carries its own on/off class, so the styling does not depend on
	// the native checkbox we hide
	$('.toh-filter-feature').each(function(){
		$(this).toggleClass('is-on', $(this).find('INPUT').is(':checked'));
	});

	var hidden_active=false;
	$('.toh-filtgroup').each(function(){
		const $group=$(this);
		const checked=$group.find('.toh-filter-feature INPUT:checked').length;
		$group.find('.toh-filtgroup-count').text(checked ? checked : '');
		$group.toggleClass('has-active', checked > 0);
		if(checked > 0 && $group.hasClass('toh-filtgroup-extra')){
			hidden_active=true;
		}
	});
	if(reveal_active && hidden_active){
		$('#toh-filters-features-content').addClass('show-all');
	}
	tohMarkActiveCollection();
	tohUpdateSummary();
}

// Update group Icons in the columns block ------------------
function updateColGroupIcons(){
	myLogFunc();
	$('.toh-viewgroup').each(function(i){
		var total=$(this).find('.toh-col-column').length;
		var checked=$(this).find('.toh-col-column INPUT:checked').length;
		var icon;
		if(checked==total){
			icon='square-check';
		}
		else if(checked==0){
			icon='square';
		}
		else{
			icon='square-minus';
		}
		tohSetIcon($(this).find('.toh-viewgroup-title .toh-ico'), icon);
	});
}

//
function setPresetSelectedClass(type,key=''){
	myLogFunc('setPresetSelectedClass : '+type+'/'+key);
	var myclass='toh-selected';
	var sel;
	if(type=='features'){
		sel='.toh-filters-presets';
	}
	else if(type=='columns'){
		// the id, not the class: the user-preset slots next to it carry the same
		// class, and buildBrowserUrl() reads the highlight back from this element
		sel='#toh-cols-presets';
	}
	else{
		myLogStr('setPresetSelectedClass - Unknown type:'+type,1);
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
