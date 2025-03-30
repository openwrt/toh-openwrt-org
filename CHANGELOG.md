# CHANGELOG

## Version 1.77 - 2025-xx-xx

* Makes View presets more responsive.
* Enhances Top Title sections
* Better multi-columns lists responsiveness
* Enhanced Details Popup (Tooltips on fields + colors)
* Highlights filter-title, on filter used
* Fixes Labels sometimes shown after icons
* Adds Boot logo animation
* Better cursors on hover
* Github Release: fix contributors list
* Small CSS improvements


## Version 1.76 - 2025-03-26

* Prettier Buttons
* Polishes UserPreset Popup
* Better Linked Colums View Box
* Fixes details-view columns responsiveness
* Smaller text in Filters & Views content
* Enhances Github "release" Actions (fixes contributors and adds commits)
* Small CSS improvements


## Version 1.75 - 2025-03-25

* Small CSS improvements
* Automatically create GH releases


## Version 1.74 - 2025-03-24

* Fixes Image preview positionning (thanks to @DIlkhush00)
* Lighter icons for generic images
* Enhances Help Tips
* Details view no longer shows generic images
* Highlights OpenWrt own Devices
* Details popup left position is now responsive


## Version 1.73 - 2025-03-20

* Adds global Search in the header
* Iconizes all links + their tooltips
* Better Details View Popup: use formatters + close button + fixes bugs + Enhanced CSS
* New Filters: Memory Confort, WifiB, WifiG, Bluetooth, GPIOs, SATA
* Adds Firmware Selector column
* Reorders filter groups and column views
* Fixes Details Popup position and scrolling
* Slightly animates background color when loading/redrawing Table data
* Better timing for global Loading indicators
* Prefetch external assets DNS for faster boot time
* Smarter FavIcon
* Global Design enhancements
* Adds Tooltips for main links
* CSS improvements for mobiles
* Smaller 'normal' (default) columns preset

## Version 1.72 - 2025-03-16

* Fixes Header CSS for mobile view
* Shows spinner icon when changing pagination
* Highlights current page (in pagination)
* Prevents page scroll when using pagination
* Displays Features Filters by Groups
* Always shows Edit Column


## Version 1.71 - 2025-03-13

* Don't wait for images before loading the table
* Displays a loading overlay, until TOH data is loaded
* Invalidates CSS & JS cache everyday
* Allows to force cache reload with "?cache=xxx" in the URL
* Adds BE Wifi (wifi 7) filter
* Show changelog in dev mode (GH page only)
* Diplays Develop branch & version (GH page only)
* Adds HwData column
* Adds row edit icon link
* Removes useless column live filters (links & downloads) 
* Fine-tunes some columns width
* Changes Table header & footer colors
* Merge & remove demo.css


## Version 1.70 - 2025-03-07

* Removes bottom feedback box
* Replaces Owrt abbreviation  by OpenWrt (in tooltip & Detail view)
* Credits contributors
* Adds .domains file (for codeberg hosting)
* Moves www files to the root folder (for easy deployment)
* Prepares migration to https://github.com/openwrt/toh-openwrt-org/


## Version 1.69 - 2025-03-05

* Rename OpenWRT to OpenWrt


## Version 1.68 - 2024-12-07

* 'Ethernet' filter features are now mutually exclusives
* Fixes Wlan 60Ghz Title typo (was 600Ghz)
* Displays Filtered / Total count in the header
* Links Header Title to TOH's base URL


## Version 1.65 - 2024-11-27

* Add all 'Type' filter features
* Fixes Wlan 600Ghz Title typo (was 200Ghz)
* 'Modem DSL' feature excludes items with unsupported DSL modem
* Correctly sorts 'Unsupported' column
* Memory, Modem & Type features are each mutually exclusive

## Version 1.61 - 2024-11-20

* Fixes RamMb HeaderFilter & Sort
* Smaller Filter Preset buttons

## Version 1.60 - 2024-11-12

* Mimic current Firmware-Selector page Header
* Mimic current Firmware-Selector page
* Add OpenWrt FavIcon

## Version 1.53 - 2024-11-07

* Rename feature filter: from "PoE powered" to "PoE capable"

## Version 1.52 - 2024-10-30

* Fix the features add/remove Tabulator filtering bug
* Correctly update browser URL after clearing filters
* Update "Availability" filters
* More "loading" icon displayed on long tasks 
* Add a CHANGELOG file
* Deluxe console logs (for developers)

## Version 1.50 - 2024-10-28

* Implement User's presets (stored in Cookies) 
* Add preset "obsolete in 24.xx"
* Update presets to use 16+64 and 64+128 features
* Add filters for 2.5GbE and 10GbE
* other updates

## Version 1.40 - 2024-10-25

* Populate checked filter, features, view, columns in the URL, allowlng to bookmark/recall a whole view 
* Significant refactor of the code

## Version 1.10 to 1.30 - 2024-10-24

* Considerable reformatting of the table appearance and columns
* Implement most filters
* Add many presets

## Version 1.0 - 2024-10-17

* Initial commit
* Basic functionality
