// ##########################################################################################################################################################
// Configuration ############################################################################################################################################
// ##########################################################################################################################################################

// global -------------------------------------------------------
const toh_app={
	version:	"1.78",	// Version
	branch:		"prod", 		// Branch, either: 'prod' | 'dev'	
};

// set the log level displayed in the console :
// 0=none
// 1=info
// 2=debug
// 3=verbose
// 4=more verbose
var toh_debug_level=1; 


// Urls --------------------------------------------------------
const toh_urls={
	www: 			"https://openwrt.org/",
	hwdata: 		"https://openwrt.org/toh/hwdata/",
	firm_select: 	"https://firmware-selector.openwrt.org/",
	firm_versions: 	"https://downloads.openwrt.org/.versions.json",
	firm_releases: 	"https://downloads.openwrt.org/releases/VERSION/.overview.json",
	toh_json:		"https://openwrt.org/toh.json",
	media:			"https://openwrt.org/_media/",
	github_commit:	"https://github.com/openwrt/openwrt/commit/",
	git_search:		"https://github.com/search?type=code&q=repo:openwrt/openwrt%20",
	forum_search:	"https://forum.openwrt.org/search?q=",
}

// Preferences --------------------------------------------------
const toh_prefs={
	def_filter: 	'',					// default Filter Preset
	def_features: 	'',					// default Features (list ',' separated)
	def_view: 		'normal',			// default Columns View Preset
	def_columns: 	'',					// default Columns (list ',' separated)
	def_show_filters: false,				// default show filters
	def_show_views: false,				// default show columns views

	p_filter:		'filter',			//name of the filter preset URL parameter
	p_features:		'features',			//name of the filter features URL parameter
	p_view:			'view',				//name of the columns  preset URL parameter
	p_columns:		'columns',			//name of the columns URL parameter

	cook_prefix:	'toh_',				// the cookie's prefix,
	cook_duration:	3600*24*730,		// the cookie's duration (in sec),
	cook_path: 		'',					// the cookie's path (will be set to the current path if not set),
	cook_preset_count: 	3,				// how many uset preset (features or columns) cookies do we use
	cook_name_features:'myFeatures', 	// name of the features cookie,
	cook_name_columns:'myColumns',		// name of the columns cookie,
	cook_max_chars: 	12,				// max number of character allowed in the cookie name

	tooltip_upreset:"User Presets: Click to Load, Shift-click to save, Alt-click to delete",
	boot_hide:		true,				// Hides the boot overlay, once inited
	preload: 		true,				// Preload images (in background)

};

// options for tabulator table (tabuTable) ---------------------
let tabulatorOptions={
	importFormat:"array",
	rowHeight:26,
	maxHeight:'100%',
	height: "100%",

	pagination: true,
	paginationCounter:"rows", 			//add pagination row counter
	paginationButtonCount: 10,
	paginationSize: 30,
	paginationSizeSelector:true,
	paginationSizeSelector:[10, 20, 30, 40, 50, 75, 100, 200, 300], //enable page size select element with these options

	rowFormatter: _rfRowFormatter,
	dataLoader: false,				// dont show the table loading overlay
	columns:[],
	movableColumns:true,      		//allow column order to be changed
	columnDefaults:{
		headerFilter:true,
		headerTooltip:true,
//		hozAlign: 'right',
		tooltip:true,         //show tool tips on cells
		headerSortTristate:true,
	},

	// initialSort:[
	// 	{column:"brand", dir:"asc"}, 	//sort by this first
	// 	{column:"model", dir:"desc"}, //then sort by this second
	// ],

	//debugEventsInternal:['data-filtered'], 

};




// ##########################################################################################################################################################
// Columns Styles ###########################################################################################################################################
// ##########################################################################################################################################################
let colFilterMin={headerFilterPlaceholder:"Minimum", headerFilterFunc:">="};

let toh_colStyles = {
//	|toh field,							|Col Name				|Full Name										|width		|Horinzontal Align	|sorter type		|stay left		|formatter						|formatterParams				|misc options
    brand:								{title: "Brand",		headerTooltip: 'Brand',							width: 100,	hozAlign: 'left',	sorter: undefined,	frozen: true,	formatter: undefined,			formatterParams: undefined,		clickPopup: _cPopupModel},
    model:								{title: "Model",		headerTooltip: 'Model',							width: 100,	hozAlign: 'left',	sorter: undefined,	frozen: true,	formatter: undefined,			formatterParams: undefined,		clickPopup: _cPopupModel},

    audioports:							{title: "Audio",		headerTooltip: 'Audio Ports',					width: 80,	hozAlign: 'left',	sorter: 'string',	frozen: false,	formatter: undefined,			formatterParams: undefined},
    availability:						{title: "Availability",	headerTooltip: 'Availability',					width: 110,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    bluetooth:							{title: "BT",			headerTooltip: 'Bluetooth version',				width: 40,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    bootloader:							{title: "Boot",			headerTooltip: 'BootLoader',					width: 60,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    buttoncount:						{title: "Butt.",		headerTooltip: 'Button count',					width: 40,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined,		...colFilterMin},
    cpu:								{title: "CPU",			headerTooltip: 'CPU',							width: 120,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: _formatCleanWords,	formatterParams: undefined},
    comments:							{title: "Comments",		headerTooltip: 'Comments',						width: 200,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    commentsavports:					{title: "AV Comments",	headerTooltip: 'AV ports Comments',				width: 60,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    commentinstallation:				{title: "Inst.Comments",headerTooltip: 'Installation Comments',			width: 60,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    commentsnetworkports:				{title: "Net Comments",	headerTooltip: 'Network ports Comments',		width: 60,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    commentrecovery:					{title: "Rec.Comments",	headerTooltip: 'Recovery Comments',				width: 60,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    commentsusbsataports:				{title: "US Comments",	headerTooltip: 'USB SATA ports Comments',		width: 60,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    cpucores:							{title: "Cores",		headerTooltip: 'CPU number of Cores',			width: 40,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined,		...colFilterMin},
    cpumhz:								{title: "Mhz",			headerTooltip: 'CPU Speed (MHz)',				width: 40,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined,		...colFilterMin},
    detachableantennas:					{title: "D.Ant.",		headerTooltip: 'Detachable Antennas',			width: 40,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    deviceid:							{title: "Device ID",	headerTooltip: 'Device ID',						width: 120,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    devicepage:							{title: "Page",			headerTooltip: 'Device Information Page',		width: 35,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,		formatterParams: {icon: 'fa-solid fa-circle-info', ttip:'Information Page'},		headerFilter: false, tooltip: false},
    devicetype:							{title: "Device Type",	headerTooltip: 'Device Type',					width: 120,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},	
    ethernet100mports:					{title: "Eth 100",		headerTooltip: 'Ethernet 100M ports',			width: 52,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: _formatCleanEmpty,	formatterParams: undefined,		...colFilterMin},
    ethernet1gports:					{title: "Eth 1G",		headerTooltip: 'Ethernet 1G ports',				width: 50,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: _formatCleanEmpty,	formatterParams: undefined,		...colFilterMin},
    ethernet2_5gports:					{title: "Eth 2.5G",		headerTooltip: 'Ethernet 2.5G ports',			width: 60,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: _formatCleanEmpty,	formatterParams: undefined,		...colFilterMin},
    ethernet5gports:					{title: "Eth 5G",		headerTooltip: 'Ethernet 5G ports',				width: 50,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: _formatCleanEmpty,	formatterParams: undefined,		...colFilterMin},
    ethernet10gports:					{title: "Eth 10G",		headerTooltip: 'Ethernet 10G ports',			width: 55,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: _formatCleanEmpty,	formatterParams: undefined,		...colFilterMin},
    fccid:								{title: "FCC",			headerTooltip: 'FCC ID',						width: 35,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,		formatterParams:  {icon: 'fa-solid fa-landmark', ttip:'FCC Search Page'},					headerFilter: false, tooltip: false},
    firmwareoemstockurl:				{title: "Stock",		headerTooltip: 'OEM Stock Firmware',			width: 35,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,		formatterParams: {icon: 'fa-solid fa-file-arrow-down', ttip:'Download Stock Firmware'},		headerFilter: false, tooltip: false},
    firmwareopenwrtinstallurl:			{title: "Install",		headerTooltip: 'OpenWrt Firmware Install',		width: 35,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,		formatterParams: {icon: 'fa-solid fa-download', ttip:'Download Installation Firmware'},		headerFilter: false, tooltip: false},
    firmwareopenwrtupgradeurl:			{title: "Upgrade",		headerTooltip: 'OpenWrt Firmware Upgrade',		width: 35,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,		formatterParams: {icon: 'fa-solid fa-download', ttip:'Download Upgrade Firmware'}, 		headerFilter: false, tooltip: false},
    firmwareopenwrtsnapshotinstallurl:	{title: "S.Install",	headerTooltip: 'OpenWrt Snapshot Install',		width: 35,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,		formatterParams: {icon: 'fa-solid fa-camera', ttip:'Download Installation Snapshot'},	headerFilter: false, tooltip: false},
    firmwareopenwrtsnapshotupgradeurl:	{title: "S.Upgrade",	headerTooltip: 'OpenWrt Snapshot Upgrade',		width: 35,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,		formatterParams: {icon: 'fa-solid fa-camera', ttip:'Download Upgrade Snapshot'},	headerFilter: false, tooltip: false},
    flashmb:							{title: "Flash",		headerTooltip: 'Flash Memory (Mb)',				width: 90,	hozAlign: 'right',	sorter: _sorterFlash,frozen: false,	formatter: _formatArray,		formatterParams: undefined, headerFilter:_hFilterFlash, headerFilterFunc:_hFilFuncFlash, headerFilterLiveFilter:false },	// , cellClick:cellDebug  , headerFilterEmptyCheck:HeaderFilterEmpty
    forumsearch:						{title: "S.Forum",		headerTooltip: 'Search in Forums',				width: 40,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,		formatterParams: {icon: 'fa-regular fa-user', ttip:'Forum Search Page', prefix:toh_urls.forum_search},	headerFilter: false, tooltip: false},	
    gitsearch:							{title: "Git Search",	headerTooltip: 'Git Search',					width: 35,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,		formatterParams: {icon: 'fa-solid fa-code', ttip:'Github Search Page', prefix:toh_urls.git_search},	headerFilter: false, tooltip: false},	
    gpios:								{title: "GPIOs",		headerTooltip: 'GPIOs',							width: 40,	hozAlign: 'right',	sorter: 'string',	frozen: false,	formatter: _formatCleanWords,	formatterParams: undefined,		...colFilterMin},
    installationmethods:				{title: "Inst.Method",	headerTooltip: 'Installation method(s)',		width: 90,	hozAlign: 'left',	sorter: 'string',	frozen: false,	formatter: undefined,			formatterParams: undefined},	
    jtag:								{title: "JTAG",			headerTooltip: 'has JTAG?',						width: 40,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: _formatYesNo,		formatterParams: undefined},	
    ledcount:							{title: "Leds",			headerTooltip: 'LED count',						width: 40,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: _formatCleanEmpty,	formatterParams: undefined,		...colFilterMin},
    modem:								{title: "Modem",		headerTooltip: 'Modem Type',					width: 55,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    oemdevicehomepageurl:				{title: "OEM",			headerTooltip: 'OEM Page',						width: 35,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,		formatterParams: {icon: 'fa-solid fa-industry', ttip:'Manufacturer Page'}, 		headerFilter: false, tooltip: false},
    outdoor:							{title: "OutDoor",		headerTooltip: 'OutDoor',						width: 40,	hozAlign: 'right',	sorter: 'string',	frozen: false,	formatter: _formatYesNo,		formatterParams: undefined},
    owrt_forum_topic_url:				{title: "Forum",		headerTooltip: 'Forum Topic',					width: 40,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,		formatterParams: {icon: 'fa-solid fa-user', ttip:'Forum Topic Page'}, 		headerFilter: false, tooltip: false},
    packagearchitecture:				{title: "Pkg Arch",		headerTooltip: 'Package Architecture',			width: 90,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    phoneports:							{title: "Phone",		headerTooltip: 'Phone Ports',					width: 40,	hozAlign: 'right',	sorter: 'string',	frozen: false,	formatter: undefined,			formatterParams: undefined},
    powersupply:						{title: "Power",		headerTooltip: 'Power Supply',					width: 70,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    picture:							{title: "Image",		headerTooltip: 'Device Picture',				width: 45,	hozAlign: "center",	sorter: 'array',	frozen: false,	formatter: _formatImages,		formatterParams: undefined,		tooltip: false},
    rammb:								{title: "RAM",			headerTooltip: 'RAM (Mb)',						width: 40,	hozAlign: 'right',	sorter: _sorterRam,	frozen: false,	formatter: undefined,			formatterParams: undefined,		...colFilterMin,headerFilterFunc:_hFilFuncRamMb},
    recoverymethods:					{title: "Recovery",		headerTooltip: 'Recovery Methods',				width: 80,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},	
    sataports:							{title: "SATA",			headerTooltip: 'SATA Ports',					width: 40,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined,		...colFilterMin},
    serial:								{title: "Serial",		headerTooltip: 'Serial port',					width: 45,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: _formatYesNo,		formatterParams: undefined},	
    serialconnectionparameters:			{title: "Serial Params.",headerTooltip: 'Serial connection parameters',	width: 90,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},	
    serialconnectionvoltage:			{title: "S.Volt.",		headerTooltip: 'Serial connection voltage',		width: 45,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},	
    sfp_ports:							{title: "SFP",			headerTooltip: 'SFP Ports',						width: 40,	hozAlign: 'right',	sorter: 'string',	frozen: false,	formatter: undefined,			formatterParams: undefined,		...colFilterMin},
    sfp_plus_ports:						{title: "SFP+",			headerTooltip: 'SFP+ Ports',					width: 40,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined,		...colFilterMin},
    subtarget:							{title: "S.Target",		headerTooltip: 'Sub Target',					width: 60,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},	
    supportedcurrentrel:				{title: "C.Release",	headerTooltip: 'Supported Current Release',		width: 60,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},	
    supportedsincecommit:				{title: "Commit",		headerTooltip: 'Supported Since Commit',		width: 54,	hozAlign: 'center',	sorter: undefined,	frozen: false,	formatter: _formatLinkCommit,	formatterParams: {},			tooltip: false},
    supportedsincerel:					{title: "S.Release",	headerTooltip: 'Supported Since Release',		width: 60,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},	
    switch:								{title: "Switch",		headerTooltip: 'Switch',						width: 120,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},	
    target:								{title: "Target",		headerTooltip: 'Target',						width: 60,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},	
    unsupported_functions:				{title: "Unsupported",	headerTooltip: 'Unsupported Functions',			width: 85,	hozAlign: 'left',	sorter: 'array',	frozen: false,	formatter: undefined,			formatterParams: undefined},	
    usbports:							{title: "USB",			headerTooltip: 'USB Ports',						width: 60,	hozAlign: 'left',	sorter: 'string',	frozen: false,	formatter: undefined,			formatterParams: undefined,		...colFilterMin},
    version:							{title: "Version",		headerTooltip: 'Hardware Version',				width: 55,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    videoports:							{title: "Video",		headerTooltip: 'Video Ports',					width: 80,	hozAlign: 'left',	sorter: 'string',	frozen: false,	formatter: undefined,			formatterParams: undefined},
    vlan:								{title: "VLAN",			headerTooltip: 'has VLAN?',						width: 40,	hozAlign: 'right',	sorter: undefined,	frozen: false,	formatter: _formatYesNo,		formatterParams: undefined},
    whereavailable:						{title: "Where to Buy",	headerTooltip: 'Where to Buy',					width: 120,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    wlandriver:							{title: "WLAN Driver",	headerTooltip: 'WLAN Driver',					width: 80,	hozAlign: 'left',	sorter: 'string',	frozen: false,	formatter: undefined,			formatterParams: undefined},
    wlan24ghz:							{title: "2.4Ghz",		headerTooltip: 'WLAN 2.4 Ghz',					width: 55,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    wlan50ghz:							{title: "5.0Ghz",		headerTooltip: 'WLAN 5.0 Ghz',					width: 60,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    wlan60ghz:							{title: "6.0Ghz",		headerTooltip: 'WLAN 6.0 Ghz',					width: 55,	hozAlign: 'left',	sorter: 'string',	frozen: false,	formatter: undefined,			formatterParams: undefined},
    wlan600ghz:							{title: "60Ghz",		headerTooltip: 'WLAN 60 Ghz',					width: 55,	hozAlign: 'left',	sorter: 'string',	frozen: false,	formatter: undefined,			formatterParams: undefined},
    wlanhardware:						{title: "WLAN Hardware",headerTooltip: 'WLAN Hardware',					width: 120,	hozAlign: 'left',	sorter: 'array',	frozen: false,	formatter: _formatArray,		formatterParams: undefined},
    wlancomments:						{title: "WLAN Comments",headerTooltip: 'WLAN Comments',					width: 100,	hozAlign: 'left',	sorter: undefined,	frozen: false,	formatter: undefined,			formatterParams: undefined},
    wikideviurl:						{title: "Wiki",			headerTooltip: 'Wiki Page',						width: 35,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,			formatterParams: {icon: 'fa-solid fa-book', ttip:'Wiki Page'}, 		headerFilter: false, tooltip: false},

    VIRT_firm:							{title: "Firmware",		headerTooltip: 'Firmware Selector Page',		width: 5,	hozAlign: 'center',	sorter: undefined,	frozen: false,	formatter: _formatLink,			formatterParams: {icon: 'fa-solid fa-cloud-arrow-down', ttip:'Firmware Selector Page'}, 		headerFilter: false, tooltip: false},
    VIRT_hwdata:						{title: "HwData",		headerTooltip: 'Hardware Data Page',			width: 35,	hozAlign: 'center',	sorter: 'string',	frozen: false,	formatter: _formatLink,			formatterParams: {icon: 'fa-solid fa-database', ttip:'Hardware Data Page'}, 		headerFilter: false, tooltip: false},
    VIRT_edit:							{title: "Edit",			headerTooltip: 'Edit HwData Page',				width: 10,	hozAlign: 'center',	sorter: undefined,	frozen: true,	formatter: _formatEditHwData,	formatterParams: undefined,		tooltip: false, headerFilter: false, headerSort: false, download: false}, 
};




// ##########################################################################################################################################################
// Views ####################################################################################################################################################
// ##########################################################################################################################################################

// View Groups ---------------------------------------------------------------------------------------------
let toh_colGroups={
	base:{
		name: 'Main',
		fields:[
			'VIRT_edit',
			'brand',
			'model',
		]
	},
	
	hardware_main:{
		name: 'Hardware',
		fields:[
			'version',
			'cpu',
			'cpucores',
			'cpumhz',
			'flashmb',
			'rammb',
			'switch',
			'wlanhardware',
		]
	},

	ports:{
		name: 'Ports',
		fields:[
			'audioports',
			'phoneports',
			'sataports',
			'usbports',
			'commentsusbsataports',
			'videoports',
			'commentsavports',
			'gpios',
			'jtag',
			'serial',
			'serialconnectionvoltage',
		]
	},


	features:{
		name: 'Features',
		fields:[
			'bluetooth',
			'buttoncount',
			'ledcount',
			'modem',
			'outdoor',
			'powersupply',
		]
	},

	ethernet:{
		name: 'Ethernet',
		fields:[
			'ethernet100mports',
			'ethernet1gports',
			'ethernet2_5gports',
			'ethernet5gports',
			'ethernet10gports',
		]
	},

	network:{
		name: 'Network',
		fields:[
			'sfp_ports',
			'sfp_plus_ports',
			'vlan',
			'commentsnetworkports',
		]
	},

	wifi:{
		name: 'Wifi',
		fields:[
			'wlan24ghz',
			'wlan50ghz',
			'wlan60ghz',
			'wlan600ghz',
			'detachableantennas',
			'wlancomments',
		]
	},

	downloads:{
		name: 'Downloads',
		fields:[
			'VIRT_firm',
			'firmwareopenwrtinstallurl',
			'firmwareopenwrtupgradeurl',
			'firmwareopenwrtsnapshotinstallurl',
			'firmwareopenwrtsnapshotupgradeurl',
			'firmwareoemstockurl',
		]
	},

	links:{
		name: 'Links',
		fields:[
			'devicepage',
			'VIRT_hwdata',
			'oemdevicehomepageurl',
			'wikideviurl',
			'owrt_forum_topic_url',
			'forumsearch',
			'fccid',
		]
	},

	openwrt:{
		name: 'OpenWrt',
		fields:[
			'deviceid',
			'target',
			'subtarget',
			'supportedcurrentrel',
			'supportedsincerel',
			'supportedsincecommit',
			'gitsearch',
			'installationmethods',
			'commentinstallation',
			'unsupported_functions',
		]
	},

	software:{
		name: 'Software',
		fields:[
			'bootloader',
			'packagearchitecture',
			'wlandriver',
			'recoverymethods',
			'commentrecovery',
			'serialconnectionparameters',
		]
	},

	misc:{
		name: 'Misc',
		fields:[
			'devicetype',			
			'availability',
			'picture',			
			'whereavailable',			
			'comments',			
		]
	},

};


// View Presets --------------------------------------------------------------------------------------------
let toh_colPresets={
	normal:	[
		...toh_colGroups.base.fields,
		...toh_colGroups.hardware_main.fields,
		...toh_colGroups.network.fields,
		...toh_colGroups.wifi.fields,
		'VIRT_firm',
		'firmwareopenwrtinstallurl',
		'firmwareopenwrtupgradeurl',
		...toh_colGroups.links.fields,
		'picture',
	],
	mini:	[
		...toh_colGroups.base.fields,
		'cpu',
		'cpucores',
		'cpumhz',
		'rammb',
		'flashmb',
		'usbports',
		'wlan24ghz',
		'wlan50ghz',
		'ethernet1gports',
		'ethernet100mports',
		'VIRT_firm',
		'VIRT_hwdata',
		'devicepage',
		'wikideviurl',
		'owrt_forum_topic_url',
		'availability',
		'picture'
		],
	hardware:	[
		...toh_colGroups.base.fields,
		...toh_colGroups.hardware_main.fields,
		...toh_colGroups.ports.fields,
		...toh_colGroups.features.fields,
	],
	network:	[
		...toh_colGroups.base.fields,
		...toh_colGroups.ethernet.fields,
		...toh_colGroups.network.fields,
		...toh_colGroups.wifi.fields,
	],
	links:	[
		...toh_colGroups.base.fields,
		...toh_colGroups.links.fields,
		...toh_colGroups.downloads.fields,
	],
	software:	[
		...toh_colGroups.base.fields,
		...toh_colGroups.openwrt.fields,
		...toh_colGroups.software.fields,
	],
	misc:	[
		...toh_colGroups.base.fields,
		...toh_colGroups.misc.fields,
	],
};


// removes some columns in the normal (groups based) preset ----
const normal_cols_to_remove=[
	'switch',
	'wlanhardware',
	'sfp_ports',
	'sfp_plus_ports',
	'vlan',
	'wlancomments',
	'commentsnetworkports',
	'forumsearch',
	'fccid',
];
toh_colPresets.normal = toh_colPresets.normal.filter(item => !normal_cols_to_remove.includes(item));




// ##########################################################################################################################################################
// Filters ##################################################################################################################################################
// ##########################################################################################################################################################

// Filter Groups ---------------------------------------------------------------------------------------------
let toh_filterGroups={
	network:{
		title:"Network",
		members:[
			'eth_1g',
			'eth_2d5g',
			'eth_10g',
			'port_sfp',
			'vlan',
		],
	},

	wifi:{
		title:"Wifi",
		members:[
			'antennas',
			'wifi_b',
			'wifi_g',
			'wifi_n',
			'wifi_ac',
			'wifi_ax',
			'wifi_be',
		],
	},

	memory:{
		title:"Memory",
		members:[
			'memory_minimum',
			'memory_more',
			'memory_confort',
		],
	},

	port:{
		title:"Ports",
		members:[
			'port_audio',
			'gpio',
			'port_phone',
			'port_sata',
			'port_usb',
			'port_video',
		],
	},

	features:{
		title:"Features",
		members:[
			'bluetooth',
			'modem_cellular',
			'modem_dsl',
			'outdoor',
			'pci',		
		],
	},

	type:{
		title:"Types",
		members:[
			'type_board',
			'type_modem',
			'type_switch',
			'type_travel',
			'type_wifiap',
			'type_wifirouter',
		],
	},

	power:{
		title:"Power",
		members:[
			'power_bat',
			'power_mains',
			'power_poe',
			'power_usb',
		],
	},
	
	misc:{
		title:"Misc",
		members:[
			'available',

		],
	},

	admin:{
		title:"Administration",
		members:[
			'miss_commit',
			'miss_devpage',
			'miss_picture',
			'miss_pkg',
			'miss_wiki',
			'miss_all',
		],
	},


};

// Filter Features -------------------------------------------------------------------------------------------
let toh_filterFeatures={

	// normal features -------------------------------
	antennas:{
		title:		"Antennas",
		description:"with detachable antennas",
		type:		"normal",
		filters:[
			{field:	"detachableantennas", 	type:">",	value:''},
			{field:	"detachableantennas", 	type:"!=",	value:'-'},
		],
	},

	available:{
		title:		"Available",
		description:"Available or Unknown",
		type:		"normal",
		filters:[
			[
				{field:	"availability", 	type:"keywords",	value:'available unknown'},
				{field:	"availability", 	type:"=",			value:null},
			],
		],
	},

	bluetooth:{
		title:		"Bluetooth",
		description:"with bluetooth",
		type:		"normal",
		filters:[
			{field:	"bluetooth", 	type:"!=",	value: null},
			{field:	"bluetooth", 	type:"!=",	value:'-'},
		],
	},

	eth_1g:{
		title:		"Ethernet 1G",
		description:"at least 1G Ethernet",
		type:		"normal",
		filters:[
			[
				{field:	"ethernet1gports", 		type:">=",	value:1},
				{field:	"ethernet2_5gports",	type:">=",	value:1},
				{field:	"ethernet5gports",		type:">=",	value:1},
				{field:	"ethernet10gports",		type:">=",	value:1},
			],
		],
		only: "eth",
	},

	eth_2d5g:{
		title:		"Ethernet 2.5G",
		description:"at least 2.5G Ethernet",
		type:		"normal",
		filters:[
			[
				{field:	"ethernet2_5gports",	type:">=",	value:1},
				{field:	"ethernet5gports",		type:">=",	value:1},
				{field:	"ethernet10gports",		type:">=",	value:1},
			],
		],
		only: "eth",
	},

	eth_10g:{
		title:		"Ethernet 10G",
		description:"at least 10G Ethernet",
		type:		"normal",
		filters:[
			{field:	"ethernet10gports",		type:">=",	value:1},
		],
		only: "eth",
	},

	gpio:{
		title:		"GPIOs",
		description:"with GPIOs",
		type:		"normal",
		filters:[
			{field:	"gpios", 	type:"!=",	value: null},
			{field:	"gpios", 	type:"!=",	value:'-'},
		],
	},

	memory_minimum:{
		title:		"Mini",
		description:"at least 16MB Flash & 64MB RAM",
		type:		"normal",
		filters:[
			{field:	"rammb", 		type:">=",		value:64},
			{field:	"flashmb", 		type:"flash>=",		value:16},
		],
		only: "memory",
	},

	memory_more:{
		title:		"More",
		description:"at least 64MB Flash & 128MB RAM",
		type:		"normal",
		filters:[
			{field:	"rammb", 		type:">=",		value:128},
			{field:	"flashmb", 		type:"flash>=",		value:64},
		],
		only: "memory",
	},

	memory_confort:{
		title:		"Confort",
		description:"at least 128MB Flash & 128MB RAM",
		type:		"normal",
		filters:[
			{field:	"rammb", 		type:">=",		value:128},
			{field:	"flashmb", 		type:"flash>=",		value:128},
		],
		only: "memory",
	},

	modem_dsl:{
		title:		"Modem: DSL",
		description:"with DSL modem",
		type:		"normal",
		filters:[
			{field:	"modem", 	type:"like",	value:'DSL'},
			{field:	"unsupported_functions", 	type:"regex",	value:'^((?!DSL).)*$'},
		],
		only: "modem",
	},

	modem_cellular:{
		title:		"Modem: Cell.",
		description:"with cellular modem",
		type:		"normal",
		filters:[
			[
				{field:	"modem", 	type:"like",	value:'LTE'},
				{field:	"modem", 	type:"like",	value:'Cellular'},
			],
		],
		only: "modem",
	},

	outdoor:{
		title:		"OutDoor",
		description:"outdoor usage",
		type:		"normal",
		filters:[
			{field:	"outdoor", 	type:"=",	value:'Yes'},
		],
	},

	pci:{
		title:		"PCI",
		description:"with PCI slot",
		type:		"normal",
		filters:[
			{field:	"comments", 	type:"like",	value:'pci'},
		],
	},

	port_audio:{
		title:		"Audio",
		description:"with audio port",
		type:		"normal",
		filters:[
			{field:	"audioports", 	type:"!=",	value: null},
			{field:	"audioports", 	type:"!=",	value:'-'},
		],
	},

	port_phone:{
		title:		"Phone",
		description:"with phone port",
		type:		"normal",
		filters:[
			{field:	"phoneports", 	type:"!=",	value: null},
			{field:	"phoneports", 	type:"!=",	value:'-'},
		],
	},

	port_sfp:{
		title:		"SFP",
		description:"with SFP port",
		type:		"normal",
		filters:[
			[
				{field:	"sfp_ports", 		type:">",	value:'0'},
				{field:	"sfp_plus_ports", 	type:">",	value:'0'},
				{field:	"devicetype", 		type:"like",value:'SFP'},
			],
		],
	},

	port_sata:{
		title:		"SATA",
		description:"with STATA port",
		type:		"normal",
		filters:[
			{field:	"sataports", 	type:">=",	value:'1'},
		],
	},
	port_usb:{
		title:		"USB",
		description:"with USB port",
		type:		"normal",
		filters:[
			{field:	"usbports", 	type:">=",	value:'1'},
		],
	},

	port_video:{
		title:		"Video",
		description:"with video port",
		type:		"normal",
		filters:[
			{field:	"videoports", 	type:"!=",	value: null},
			{field:	"videoports", 	type:"!=",	value:'-'},
		],
	},

	power_bat:{
		title:		"Battery",
		description:"battery powered",
		type:		"normal",
		filters:[
			{field:	"powersupply", 	type:"like",	value:'battery'},
		],
	},

	power_mains:{
		title:		"Mains",
		description:"mains powered",
		type:		"normal",
		filters:[
			[
				{field:	"powersupply", 	type:"like",	value:'240'},
				{field:	"powersupply", 	type:"like",	value:'mains'},
			],
		],
	},

	power_poe:{
		title:		"PoE",
		description:"PoE capable",
		type:		"normal",
		filters:[
			{field:	"powersupply", 	type:"like",	value:'poe'},
		],
	},

	power_usb:{
		title:		"USB",
		description:"USB powered",
		type:		"normal",
		filters:[
			{field:	"powersupply", 	type:"like",	value:'usb'},
		],
	},

	type_board:{
		title:		"Board",
		description:"Single board computer",
		type:		"normal",
		filters:[
			{field:	"devicetype", 	type:"like",	value:'Single Board Computer'},
		],
		only: "type",
	},

	type_modem:{
		title:		"Modem",
		description:"with modem",
		type:		"normal",
		filters:[
			{field:	"devicetype", 	type:"like",	value:'Modem'},
		],
		only: "type",
	},

	type_switch:{
		title:		"Switch",
		description:"Switch oriented",
		type:		"normal",
		filters:[
			{field:	"devicetype", 	type:"like",	value:'Switch'},
		],
		only: "type",
	},

	type_travel:{
		title:		"Travel",
		description:"Portable device",
		type:		"normal",
		filters:[
			{field:	"devicetype", 	type:"like",	value:'Travel'},
		],
		only: "type",
	},

	type_wifiap:{
		title:		"Wifi AP",
		description:"Wifi AP",
		type:		"normal",
		filters:[
			{field:	"devicetype", 	type:"like",	value:'Wifi AP'},
		],
		only: "type",
	},

	type_wifirouter:{
		title:		"Wifi Router",
		description:"Wifi Router",
		type:		"normal",
		filters:[
			{field:	"devicetype", 	type:"like",	value:'Wifi Router'},
		],
		only: "type",
	},


	vlan:{
		title:		"VLAN",
		description:"supports VLAN",
		type:		"normal",
		filters:[
			{field:	"vlan", 	type:"=",	value:'Yes'},
		],
	},


	wifi_b:{
		title:		"Wifi: B",
		description:"with 802.11b (Wifi1)",
		type:		"normal",
		filters:[
			[
				{field:	"wlan24ghz", 	type:"like",	value:'b'},
			],
		],
	},

	wifi_g:{
		title:		"Wifi: G",
		description:"with 802.11g (Wifi3)",
		type:		"normal",
		filters:[
			[
				{field:	"wlan24ghz", 	type:"like",	value:'g'},
			],
		],
	},


	wifi_n:{
		title:		"Wifi: N",
		description:"with 802.11n (Wifi4)",
		type:		"normal",
		filters:[
			[
				{field:	"wlan24ghz", 	type:"like",	value:'n'},
				{field:	"wlan50ghz", 	type:"like",	value:'n'},
			],
		],
	},

	wifi_ac:{
		title:		"Wifi: AC",
		description:"with 802.11ac (Wifi5)",
		type:		"normal",
		filters:[
			{field:	"wlan50ghz", 	type:"like",	value:'ac'},
		],
	},

	wifi_ax:{
		title:		"Wifi: AX",
		description:"with 802.11ax (Wifi6)",
		type:		"normal",
		filters:[
			[
				{field:	"wlan24ghz", 	type:"like",	value:'ax'},
				{field:	"wlan50ghz", 	type:"like",	value:'ax'},
				{field:	"wlan60ghz", 	type:"like",	value:'ax'},
			],
		],
	},

	wifi_be:{
		title:		"Wifi: BE",
		description:"with 802.11be (Wifi7)",
		type:		"normal",
		filters:[
			[
				{field:	"wlan24ghz", 	type:"like",	value:'be'},
				{field:	"wlan50ghz", 	type:"like",	value:'be'},
				{field:	"wlan60ghz", 	type:"like",	value:'be'},
			],
		],
	},

	// admin features --------------------------------

	miss_commit:{
		title:		"Miss Git",
		description:"missing Git commit",
		type:		"admin",
		filters:[
			{field:	"supportedsincecommit", 	type:"=",	value:null},
		],
	},

	miss_devpage:{
		title:		"Miss Dev Page",
		description:"missing device page",
		type:		"admin",
		filters:[
			{field:	"devicepage", 	type:"=",	value:null},
		],
	},

	miss_picture:{
		title:		"Miss Picture",
		description:"missing Picture",
		type:		"admin",
		filters:[
			[
				{field:	"picture", 	type:"=",	value:null},
				{field:	"picture", 	type:"like",	value:'genericrouter1.png'},
			],
		],
	},

	miss_pkg:{
		title:		"Miss Pkg",
		description:"missing Package Ach.",
		type:		"admin",
		filters:[
			{field:	"packagearchitecture", 	type:"=",	value:null},
		],
	},

	miss_wiki:{
		title:		"Miss Wiki",
		description:"missing Wiki page",
		type:		"admin",
		filters:[
			{field:	"wikideviurl", 	type:"=",	value:null},
		],
	},

	miss_all:{
		title:		"Miss Something",
		description:"miss anything above",
		type:		"admin",
		filters:[
			[
				{field:	"supportedsincecommit", 	type:"=",	value:null},
				{field:	"devicepage", 				type:"=",	value:null},
				{field:	"picture", 					type:"=",	value:null},
				{field:	"picture", 					type:"like",	value:'genericrouter1.png'},
				{field:	"packagearchitecture", 		type:"=",	value:null},
				{field:	"wikideviurl", 				type:"=",	value:null},
			],
		],
	},


};


// Filter Presets --------------------------------------------------------------------------------------------
let toh_filterPresets={
	
	minimum_1664_ac_avail: {
		title:"Mini, AC, Avail.",
		description:"At least 16MB Flash & 64MB RAM + AC Wifi + Available",
		orig_url:"",
		filters:[],
		features:[
			'available',
			'memory_minimum',
			'wifi_ac',
		]
	},

	minimum_1664_ac_gbit_avail: {
		title:"Mini, AC, Gbit, Avail.",
		description:"At least 16MB Flash & 64MB RAM + AC Wifi + 1Gb Eth. + Available",
		orig_url:"https://openwrt.org/toh/views/toh_available_864_ac-wifi_gbit-eth",
		filters:[],
		features:[
			'available',
			'memory_minimum',
			'wifi_ac',
			'eth_1g',
		]
	},

	minimum_1664_ac_gbit_avail_ant: {
		title:"Mini, AC, Gbit, Avail., Ant.",
		description:"At least 16MB Flash & 64MB RAM + AC Wifi + 1Gb Eth. + Available + Antennas",
		orig_url:"https://openwrt.org/toh/views/toh_available_864_dual-wifi_gbit_extant",
		filters:[],
		features:[
			'available',
			'memory_minimum',
			'wifi_ac',
			'eth_1g',
			'antennas',
		]
	},

	minimum_1664_ax_gbit_avail: {
		title:"Mini, AX, Gbit, Avail.",
		description:"At least 16MB Flash & 64MB RAM + AX Wifi + 1Gb Eth. + Available",
		orig_url:"",
		filters:[],
		features:[
			'available',
			'memory_minimum',
			'wifi_ax',
			'eth_1g',
		]
	},

	more_864_ac_gbit_avail: {
		title:"More, AC, Gbit, Avail.",
		description:"At least 64MB Flash & 128MB RAM + AC Wifi + 1Gb Eth. + Available",
		orig_url:"",
		filters:[],
		features:[
			'available',
			'memory_more',
			'wifi_ac',
			'eth_1g',
		]
	},

	more_864_ax_gbit_avail: {
		title:"More, AX, Gbit, Avail.",
		description:"At least 64MB Flash & 128MB RAM + AX Wifi + 1Gb Eth. + Available",
		orig_url:"",
		filters:[],
		features:[
			'available',
			'memory_more',
			'wifi_ax',
			'eth_1g',
		]
	},

};





// ########################################################################################################################################
// # functions referenced in colums definitions & tabulatorOptions  #######################################################################
// ########################################################################################################################################

function _rfRowFormatter(row){
	return tabuRowFormatter(row);
}

function _cPopupModel(e, cell, onRendered) {
	return CellPopupModel(e, cell, onRendered)
}


function _hFilterFlash(cell, onRendered, success, cancel, editorParams){
	return HeaderFilterFlash(cell, onRendered, success, cancel, editorParams);
}
function _hFilFuncFlash(headerValue, rowValue, rowData, filterParams){
	return HeaderFilterFuncFlash(headerValue, rowValue, rowData, filterParams);
}
function _hFilFuncRamMb(headerValue, rowValue, rowData, filterParams){
	return HeaderFilterFuncRamMb(headerValue, rowValue, rowData, filterParams);
}


function _sorterFlash(a, b, aRow, bRow, column, dir, sorterParams){
	return SorterFlash(a, b, aRow, bRow, column, dir, sorterParams);
}
function _sorterRam(a, b, aRow, bRow, column, dir, sorterParams){
	return SorterRam(a, b, aRow, bRow, column, dir, sorterParams);
}


function _formatLink(cell, params, onRendered) {
	return FormatterLink(cell, params, onRendered);
}
function _formatLinkCommit(cell, params, onRendered) {
	return FormatterLinkCommit(cell, params, onRendered);
}
function _formatEditHwData(cell, formatterParams, onRendered) {
	return FormatterEditHwData(cell, formatterParams, onRendered);
}
function _formatImages(cell, formatterParams, onRendered) {
	return FormatterImages(cell, formatterParams, onRendered);
}
function _formatCleanEmpty(cell, formatterParams, onRendered) {
	return FormatterCleanEmpty(cell, formatterParams, onRendered);
}
function _formatCleanWords(cell, formatterParams, onRendered) {
	return FormatterCleanWords(cell, formatterParams, onRendered);
}
function _formatArray(cell, formatterParams, onRendered) {
	return FormatterArray(cell, formatterParams, onRendered);
}
function _formatYesNo(cell, formatterParams, onRendered) {
	return FormatterYesNo(cell, formatterParams, onRendered);
}
