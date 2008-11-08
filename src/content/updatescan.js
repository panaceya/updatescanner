/* ***** BEGIN LICENSE BLOCK *****
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Update Scanner.
 * 
 * The Initial Developer of the Original Code is Pete Burgers.
 * Portions created by Pete Burgers are Copyright (C) 2006-2007
 * All Rights Reserved.
 * 
 * Contributor(s):
 * Portions from Sage project:
 * Peter Andrews <petea@jhu.edu>
 * Erik Arvidsson <erik@eae.net>
 * 
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.  
 * ***** END LICENSE BLOCK ***** */

 
if (typeof(USc_updatescan_exists) != 'boolean') {
var USc_updatescan_exists = true;

var USc_defaults = {
  DEF_THRESHOLD : 100,
  DEF_SCAN_RATE_MINS : 1440, // Scan once per day by default
  DEF_IGNORE_NUMBERS : true,
  DEF_ENCODING : "auto",
  DEF_LAST_SCAN : "5 November 1978",
  DEF_OLD_LAST_SCAN : "5 November 1978",
  DEF_LAST_AUTOSCAN : "5 November 1978"
};

var USc_updatescan = {    

numChanges : 0,
refresh : null,
scan: null,
_branch: null,
tree : null,

load : function()
{
    var me = USc_updatescan;
    var r;

    USc_upgrade.check(); // See if we need to upgrade something

    me._extendPlacesTreeView();
    
    me.tree = document.getElementById("bookmarks-view");
    me.tree.onclick=me._treeClick;
   
    var rootFolderId = USc_places.getRootFolderId();
    me.tree.place = "place:queryType=1&folder=" + rootFolderId;
    
    PlacesUtils.annotations.addObserver(USc_sidebarAnnotationObserver);
    
    // Check for toolbar button changes
    me._branch = Components.classes["@mozilla.org/preferences-service;1"]
    me._branch = me._branch.getService(Components.interfaces.nsIPrefService);
    me._branch = me._branch.getBranch("extensions.updatescan.toolbar.");
    me._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    me._branch.addObserver("", this, false);
    me._updateToolbar();
},

unload : function()
{
    var me = USc_updatescan;
  
    try { 
      PlacesUtils.annotations.removeObserver(USc_sidebarAnnotationObserver);
    } catch(e) {}
    try {
      me._branch.removeObserver("", this);
    } catch(e) {}
},

observe: function(aSubject, aTopic, aData) // Observe toolbar button preference changes
{
    var me = USc_updatescan;
    if (aTopic == "nsPref:changed") {
	me._updateToolbar();
    }
},

_treeClick : function(aEvent) {
    var me = USc_updatescan;
    if (aEvent.button == 2) {
      return;
    }

    var tbo = me.tree.treeBoxObject;
    var row = { }, col = { }, obj = { };
    tbo.getCellAt(aEvent.clientX, aEvent.clientY, row, col, obj);

    if (row.value == -1 || obj.value == "twisty") {
      return;
    }
    
    switch (aEvent.button) {
        case 0:
            me.diffSelectedItemThisWindow();
            break;
        case 1:
            me.diffSelectedItemNewTab();
            break;
    }
},

scanButtonClick : function()
{
    var me = USc_updatescan;    
    var id;
    var numitems;
    var str=document.getElementById("updatescanStrings")
    var ignoreNumbers;
    var encoding;

    me._showStopButton();

    me.scan = new USc_scanner();
    me.numChanges = 0;

    if (me.scan.addItems(USc_places.getRootFolderId(), false) > 0)
    {
      me.scan.start(me._scanChangedCallback,
                    me._scanFinishedCallback,
                    me._showProgress,
                    me._scanEncodingCallback);
    } else {
        me.numChanges = 0;
        me._scanFinishedCallback(str.getString("treeEmptyAlert"));
    }
    
},

scanSelectedPage : function()
{
///TODO
/**    var me = USc_updatescan;    
    var id;
    var filebase;
    var numitems;
    var str=document.getElementById("updatescanStrings")
    var ignoreNumbers;
    var encoding;

    var id = me.tree.selectedNode.itemId;
    if (id == "") return;

    me._showStopButton();
    
    me.scan = new USc_scanner();
        
    filebase=USc_file.escapeFilename(id);
    encoding = USc_rdf.queryItem(id, "encoding", "UTF-8");
    if (USc_rdf.queryItem(id, "ignoreNumbers", "false") == "true") {
    NOTE: ignorenumber is now always stored as a boolean
	ignoreNumbers = true;
    } else {
	ignoreNumbers = false;
    }
    me.scan.addURL(id, USc_rdf.queryItem(id, "title", "No Title"), 
		   USc_rdf.queryItem(id, "url", ""), 
		   USc_file.USreadFile(filebase+".new"),
		   USc_rdf.queryItem(id, "threshold", 100),
		   ignoreNumbers,
		   USc_rdf.queryItem(id, "encoding", "auto"));

    me.numChanges=0;
    me.scan.start(me._scanChangedCallback, me._scanFinishedCallback, me._showProgress,
		  me._scanEncodingCallback);
**/
},

_scanChangedCallback : function(id, new_content, status, statusText, headerText)
{
    var me = USc_updatescan;
    if (USc_processScanChange(id, new_content, status, statusText, headerText)) {
        me.numChanges++;
    }
},

_scanEncodingCallback : function(id, encoding)
// Called when encoding is detected for a page marked for auto-detect encoding
{
    USc_places.modifyAnno(id, USc_places.ANNO_ENCODING, encoding);
},

_scanFinishedCallback : function()
{
    var me = USc_updatescan;
    var str=document.getElementById("updatescanStrings");
    var param;
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService();
    prefService = prefService.QueryInterface(Components.interfaces.nsIPrefService);
    var prefBranch = prefService.getBranch("extensions.updatescan.");

    if (me.numChanges == 0) {
        me._setStatus(str.getString("statusNoChanges"));
    } else if (prefBranch.getBoolPref("notifications.enable")) {
        if (me.numChanges == 1) {
            me._setStatus(str.getString("statusOneChange"));
            message = str.getString("alertOneChange");
        } else {
            param = {numChanges:me.numChanges};
            me._setStatus(str.getString("statusManyChanges").USc_supplant(param));
            message = str.getString("alertManyChanges").USc_supplant(param);
        }
        window.openDialog("chrome://updatescan/content/alert.xul",
                  "alert:alert",
                  "chrome,dialog=yes,titlebar=no,popup=yes",
                  message);
    }
    me._hideProgress();
    me._showScanButton();
},

stopButtonClick : function()
{
    var me = USc_updatescan;
    var str=document.getElementById("updatescanStrings");
    if (me.scan != null) {
        me.scan.cancel();
    }
    me._hideProgress();
    me._showScanButton();
    me._setStatus(str.getString("statusCancel"));
},

openNewDialogGetURL : function()
// Opens a "New Item" dialog with the current page's URL/Title
{
    var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow) 

    USc_overlay.addToUpdateScan(mainWindow.document.getElementById('content'))
},

openNewDialogFromContext : function()
// Opens a "New Item" dialog, and saves the new bookmark in the correct position
{
  var me = USc_updatescan;
  var id = me.tree.selectedNode.itemId;
  if (USc_places.isFolder(id)) {
    me.openNewDialog('','',id);
  } else {
    me.openNewDialog('','',
                     USc_places.getParentFolder(id),
                     USc_places.getIndex(id));
  }
},

openNewDialog : function(title, url, parentId, index)
{
    if (typeof parentId == 'undefined' )
      parentId = USc_places.getRootFolderId();
    if (typeof index == 'iundefined') 
      index = -1; // Insert at the bottom by default

    var args = {
        title:          title, 
        url:            url, 
        threshold:      USc_defaults.DEF_THRESHOLD,
        scanRateMins:   USc_defaults.DEF_SCAN_RATE_MINS,
        encoding:       USc_defaults.DEF_ENCODING,
        ignoreNumbers:  USc_defaults.DEF_IGNORE_NUMBERS,
        advanced:       true
    };

    window.openDialog('chrome://updatescan/content/dlgnewedit.xul', 'dlgNew', 
                      'chrome,dialog,modal,centrescreen', args);
    if (args.ok) {
        var id = USc_places.addBookmark(args.title, args.url, parentId, index);
        USc_places.modifyAnno(id, USc_places.ANNO_THRESHOLD, args.threshold);
        USc_places.modifyAnno(id, USc_places.ANNO_SCAN_RATE_MINS, args.scanRateMins);
        USc_places.modifyAnno(id, USc_places.ANNO_ENCODING, args.encoding);
        USc_places.modifyAnno(id, USc_places.ANNO_IGNORE_NUMBERS, args.ignoreNumbers);

        var filebase=USc_places.getSignature(id);
        USc_file.USwriteFile(filebase+".new", "");

        USc_places.modifyAnno(id, USc_places.ANNO_LAST_SCAN, "");
        USc_places.modifyAnno(id, USc_places.ANNO_STATUS, USc_places.STATUS_NO_UPDATE);
    }
},

openEditDialog : function()
{
    var me = USc_updatescan;
    var id = me.tree.selectedNode.itemId;
    if (id == "") return;

    var args = {
        title:          USc_places.getTitle(id),
        url:            USc_places.getURL(id),
        threshold:      USc_places.queryAnno(id, USc_places.ANNO_THRESHOLD,
                                             USc_defaults.DEF_THRESHOLD),
        scanRateMins:   USc_places.queryAnno(id, USc_places.ANNO_SCAN_RATE_MINS,
                                             USc_defaults.DEF_SCAN_RATE_MINS),
        encoding:       USc_places.queryAnno(id, USc_places.ANNO_ENCODING,
                                             USc_defaults.DEF_ENCODING),
        ignoreNumbers:  USc_places.queryAnno(id, USc_places.ANNO_IGNORE_NUMBERS,
                                             USc_defaults.DEF_IGNORE_NUMBERS),
        advanced:       true
    }

    var oldurl = args.url;

    window.openDialog('chrome://updatescan/content/dlgnewedit.xul', 'dlgEdit', 
                      'chrome,dialog,modal,centrescreen', args);
                      
    if (args.ok) {
        USc_places.setTitle(id, args.title);
        USc_places.setURL(id, args.url);
        
        USc_places.modifyAnno(id, USc_places.ANNO_THRESHOLD, args.threshold);
        USc_places.modifyAnno(id, USc_places.ANNO_SCAN_RATE_MINS, args.scanRateMins);
        USc_places.modifyAnno(id, USc_places.ANNO_ENCODING, args.encoding);
        USc_places.modifyAnno(id, USc_places.ANNO_IGNORE_NUMBERS, args.ignoreNumbers);

        if (oldurl != args.url) {   // URL changed - reset all values
          // Create a new signature
          USc_places.modifyAnno(id, USc_places.ANNO_SIGNATURE, "")
          var filebase=USc_places.getSignature(id);
          USc_file.USwriteFile(filebase+".new", "");

          USc_places.modifyAnno(id, USc_places.ANNO_LAST_SCAN, "");
          USc_places.modifyAnno(id, USc_places.ANNO_STATUS, USc_places.STATUS_NO_UPDATE);
        }
    }
},

openPreferences : function()
{
    window.openDialog('chrome://updatescan/content/preferences.xul',
                      'dlgUpdatescannerPreferences',
                      'chrome,toolbar,dialog=no,resizable,centerscreen');
},

_diffItem : function(id)
{
    var me = USc_updatescan;

    if (USc_places.isFolder(id))
      return;
    
    var now = new Date();
    if (USc_places.queryAnno(id, USc_places.ANNO_STATUS, "") == USc_places.STATUS_UPDATE)
    {
      USc_places.modifyAnno(id, USc_places.ANNO_STATUS, USc_places.STATUS_NO_UPDATE);      
    }
    
    var old_lastScan = USc_places.queryAnno(id,
                                            USc_places.ANNO_OLD_LAST_SCAN,
                                            USc_defaults.DEF_OLD_LAST_SCAN);
    old_lastScan = new Date(old_lastScan);

    var oldDate = me._dateDiffString(old_lastScan, now);

    var lastScan = USc_places.queryAnno(id, USc_places.ANNO_LAST_SCAN, USc_defaults.DEF_LAST_SCAN);
    lastScan = new Date(lastScan);
    
    var newDate = me._dateDiffString(lastScan, now);

    return "chrome://updatescan/content/diffPage.xul?id="+escape(id)+
	   "&title="+escape(USc_places.getTitle(id))+
	   "&url="+escape(USc_places.getURL(id))+
           "&oldDate="+escape(oldDate)+
           "&newDate="+escape(newDate);
},

diffSelectedItemThisWindow : function()
{
    var me = USc_updatescan;
    var item = me.tree.selectedNode.itemId;
    if (item == undefined) return;
    me._diffItemThisWindow(item);
},

_diffItemThisWindow : function(id)
{
    var me = USc_updatescan;
    var diffURL = me._diffItem(id)
    if (diffURL) {
      USc_topWin.open(diffURL);
      me.tree.focus();
    }
},

diffSelectedItemNewTab : function()
{
    var me = USc_updatescan;
    var item = me.tree.selectedNode.itemId;
    if (item == undefined) return;
    me._diffItemNewTab(item);    
},

_diffItemNewTab : function(id)
{
    var me = USc_updatescan;

    var mainWindow = window.QueryInterface(
    Components.interfaces.nsIInterfaceRequestor)
    .getInterface(Components.interfaces.nsIWebNavigation)
    .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
    .rootTreeItem
    .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
    .getInterface(Components.interfaces.nsIDOMWindow);

    var diffURL = me._diffItem(id);
    if (diffURL) {
      mainWindow.getBrowser().selectedTab = mainWindow.getBrowser().addTab(diffURL);
      me.tree.focus();
    }
},

_dateDiffString : function(oldDate, newDate)
{
    var ret; 
    var time;
    var str=document.getElementById("updatescanStrings")

    var diff = newDate.getTime() - oldDate.getTime();
    diff = diff / 1000; // convert to seconds
    diff = diff / 60;   // minutes
    diff = diff / 60;   // hours
    if (diff < 24) {
        time = oldDate.getHours()+":";
        var mins = oldDate.getMinutes().toString();
        if (mins.length == 1) {
            mins = "0" + mins;
        }
        time += mins;

        if (oldDate.getDate() != newDate.getDate()) {
            return str.getString("yesterdayAt").USc_supplant({time:time});
        } else {
            return str.getString("todayAt").USc_supplant({time:time});
        }
    }

    diff = diff / 24;
    if (diff < 7) {
        diff = Math.floor(diff);
        if (diff == 1) {
            return str.getString("dayAgo");
        } else {
            return str.getString("daysAgo").USc_supplant({numDays:diff});
        }
    }
    diff = diff / 7;
    diff = Math.floor(diff);
    if (diff == 1) {
        return str.getString("weekAgo");
    } else {
        return str.getString("weeksAgo").USc_supplant({numWeeks:diff});
    }
},

markAllAsVisited : function()
{
/**    var me = USc_updatescan;
    var tree = document.getElementById("UpdateTree");
    var ids = new Array();
    var str=document.getElementById("updatescanStrings")

    var numitems = me._getNumItems();
    if (numitems > 0) {

        for (var i=0; i<numitems; i++) {
            var id = tree.contentView.getItemAtIndex(i).id;
            ids.push(id);

//            if (USc_rdf.queryItem(id, "changed") != "0") {
//                USc_rdf.modifyItem(id, "changed", "0");
//                me._refreshTree();
//            }
        }

        var params = {label:str.getString("markLabel"), 
                      callback:me._markAsVisited, 
                      items:ids, 
                      data:null, 
                      cancelPrompt:str.getString("markCancel"), 
                      retVal:null, 
                      retData:null};       
        window.openDialog('chrome://updatescan/content/progress.xul', 
                          'dlgProgress', 
                          'chrome,dialog,modal,centrescreen', params);
        USc_rdf.save();
        me._refreshTree();
        me.refresh.request();
    }
    **/
},

_markAsVisited : function(item, data)
{
  /**
    if (USc_rdf.queryItem(item, "changed") != "0") {
        USc_rdf.modifyItem(item, "changed", "0");
    }
    **/
},

showAllChangesInNewTabs : function()
{
    var me = USc_updatescan;
    var tree = document.getElementById("UpdateTree");

    var numItems = me._getNumItems();
    if (numItems > 0) {
        for (var i=0; i<numItems; i++) {
            var id = tree.contentView.getItemAtIndex(i).id;
            if (USc_rdf.queryItem(id, "changed") != "0") {
                me._diffItemNewTab(id);
            }
        }
    }
},

sortByName : function()
{
  /**
    var me = USc_updatescan;
    var i;
    var id;
    var item;
    var tree = document.getElementById("UpdateTree");
    var numitems = me._getNumItems();
    var data = new Array();
    var indexes = new Array();
    var params;
    var str=document.getElementById("updatescanStrings");

    // Get a list of ids & titles
    if (numitems > 0)
    {
        for (var i=0; i<numitems; i++)
        {
            id = tree.contentView.getItemAtIndex(i).id;
            item = {id:id, title:USc_rdf.queryItem(id, "title").toLowerCase()}
            data.push(item);
            indexes.push(i);
        }
        // Open the progress dialog and perform the sort
        params = {label:str.getString("sortLabel"), callback:me._sortItem, 
                  items:indexes, data:data, 
                  cancelPrompt:str.getString("sortCancel"), 
                  retVal:null, retData:null};       
        window.openDialog('chrome://updatescan/content/progress.xul', 
                          'dlgProgress', 
                          'chrome,dialog,modal,centrescreen', params);

        USc_rdf.save();
        me._refreshTree();
        me.refresh.request();
    }
    **/
},

_sortItem : function(index, data)
// Passed the current index and the remaining items to sort.
// Finds the smallest item, moves it into position, removes it from the 
// data array.
{
    var i;
    var smallestIndex = 0;
    var smallestTitle = data[0].title;
    var count = data.length;
    for (i=1; i<count; i++) {
        if (data[i].title < smallestTitle) {
            smallestIndex = i;
            smallestTitle = data[i].title;
        }
    }
    if (smallestIndex != 0) {
        USc_rdf.moveItem(data[smallestIndex].id, index); // Move into position
    }
    data.splice(smallestIndex, 1);              // Remove from data array
    return null;    
},

openHelp : function()
{
    var str=document.getElementById("updatescanStrings")
    var locale = Components.classes["@mozilla.org/preferences-service;1"].
                 getService(Components.interfaces.nsIPrefService).
                 getBranch("general.useragent.").
                 getCharPref("locale");
    var helpURL="http://updatescanner.mozdev.org/redirect.php?page=help.html&locale="+locale;
    USc_topWin.open(helpURL);
},

deleteSelectedItem : function()
{
  /**
    var me = USc_updatescan;
    var str=document.getElementById("updatescanStrings")
    var id=me.tree.selectedNode.itemId;
    var fileBase=USc_file.escapeFilename(id)

    if (id == "") return;
    var title = USc_rdf.queryItem(id, "title", "untitled");

//    if (confirm(str.getString("confirmDelete") + " " + title + "?")) {
        USc_file.USrmFile(fileBase+".old");
        USc_file.USrmFile(fileBase+".new");
        USc_file.USrmFile(fileBase+".dif");
        USc_rdf.deleteItem(id);
        USc_rdf.save();
        me._refreshTree();
        me.refresh.request();
//    }
**/
},

_showStopButton : function()
{
    var scanbutton = document.getElementById("scanbutton");
    scanbutton.setAttribute("label", scanbutton.getAttribute("stopbuttonlabel"));
    scanbutton.setAttribute("oncommand", scanbutton.getAttribute("stopbuttoncommand"));
},

_showScanButton : function()
{
    var scanbutton = document.getElementById("scanbutton");
    scanbutton.setAttribute("label", scanbutton.getAttribute("scanbuttonlabel"));
    scanbutton.setAttribute("oncommand", scanbutton.getAttribute("scanbuttoncommand"));
},

_refreshTree : function()
{
  /**
    try {
        var tree=document.getElementById("UpdateTree");
        var savedRow = tree.currentIndex;
        var scrollRow = tree.boxObject.getFirstVisibleRow();
        tree.builder.rebuild();    
        tree.view.selection.select(savedRow);
        tree.boxObject.scrollToRow(scrollRow);
    } catch (e) {
        ;
    }
    **/
},

_setStatus : function (status)
{
    document.getElementById("StatusText").value = status;
},

_showProgress : function(title, value, max)
{
    var me = USc_updatescan;
    var str=document.getElementById("updatescanStrings")
    var param = {title:title};
    me._setStatus(str.getString("statusScanning").USc_supplant(param));

    var progress = document.getElementById("Progress");
    progress.collapsed = false;
    progress.value = 100*value/max;
},

_hideProgress : function()
{   
    document.getElementById("Progress").collapsed=true;
},

_getNumItems : function()
{
  /**
    var tree = document.getElementById("UpdateTree");
    try {
        return tree.contentView.rowCount;
    } catch(e) {
        return 0;
    }
    **/
},

_updateToolbar : function()
{
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService();
    prefService = prefService.QueryInterface(Components.interfaces.nsIPrefService);
    var prefBranch = prefService.getBranch("extensions.updatescan.toolbar.");

    document.getElementById("new-button").hidden = !prefBranch.getBoolPref("new");
    document.getElementById("newtab-button").hidden = !prefBranch.getBoolPref("newTab");
    document.getElementById("checked-button").hidden = !prefBranch.getBoolPref("markVisited");
    document.getElementById("delete-button").hidden = !prefBranch.getBoolPref("delete");
    document.getElementById("settings-button").hidden = !prefBranch.getBoolPref("preferences");
    document.getElementById("help-button").hidden = !prefBranch.getBoolPref("help");
},

_extendPlacesTreeView : function() {
    PlacesTreeView.prototype.getCellPropertiesBase = PlacesTreeView.prototype.getCellProperties;
    PlacesTreeView.prototype.getCellProperties =
    function ext_getCellProperties(aRow, aColumn, aProperties) {
      var properties = this._visibleElements[aRow].properties;
      
      var propertiesBase = Cc["@mozilla.org/supports-array;1"].createInstance(Ci.nsISupportsArray);
      this.getCellPropertiesBase(aRow, aColumn, propertiesBase);
      var proptery;
      for (var i = 0; i < propertiesBase.Count(); i++) {
        property = propertiesBase.GetElementAt(i);
        if (property != this._getAtomFor("livemark")) {
          aProperties.AppendElement(propertiesBase.GetElementAt(i));
        }
      }
          
      if (aColumn.id != "title")
        return;
      
      if (!properties) {
        properties = [];
        var node = this._visibleElements[aRow].node;
        var nodeType = node.type;
        var itemId = node.itemId;
        if (nodeType == Ci.nsINavHistoryResultNode.RESULT_TYPE_URI) {
          if (!PlacesUtils.nodeIsLivemarkContainer(node.parent)) {
            try {
              var state = PlacesUtils.annotations.getItemAnnotation(itemId, USc_places.ANNO_STATUS);
              properties.push(this._getAtomFor("usc_state_" + state));
            } catch (e) { }
          }
        } else if (nodeType == Ci.nsINavHistoryResultNode.RESULT_TYPE_FOLDER) {
          try {
            var state = PlacesUtils.annotations.getItemAnnotation(itemId, USc_places.ANNO_STATUS);
            properties.push(this._getAtomFor("usc_state_" + state));
          } catch (e) { }
        }
        for (var i = 0; i < properties.length; i++) {
          aProperties.AppendElement(properties[i]);
          this._visibleElements[aRow].properties.push(properties[i]);
        }
      }
    }
    PlacesTreeView.prototype.isContainerBase = PlacesTreeView.prototype.isContainer;
    PlacesTreeView.prototype.isContainer =
    function ext_isContainer(aRow) {
      var baseValue = this.isContainerBase(aRow);
       if (baseValue) {
         var node = this._visibleElements[aRow].node;
         if (PlacesUtils.annotations.itemHasAnnotation(node.itemId, LMANNO_FEEDURI)) {
           return false;
         } else {
           return true;
         }
       } else {
         return false;
       }
    }

    // Override the getImageSrc function, to insert the updatescanner icon
    // if the page is updated
    PlacesTreeView.prototype.getImageSrcBase = PlacesTreeView.prototype.getImageSrc;
    PlacesTreeView.prototype.getImageSrc =
    function ext_getImageSrc(aRow, aColumn) {
      this._ensureValidRow(aRow);

      // only the title column has an image
      if (this._getColumnType(aColumn) != this.COLUMN_TYPE_TITLE)
        return "";

      var node = this._visibleElements[aRow].node;
      var status= USc_places.queryAnno(node.itemId, USc_places.ANNO_STATUS,
                                       USc_places.STATUS_UNKNOWN)

      if (status == USc_places.STATUS_UPDATE) {
          return ""; // Let updatscan.css choose the icon
      }
      
      // Use favicon if possible
      return this.getImageSrcBase(aRow, aColumn);
    }  
}
};

var USc_sidebarAnnotationObserver = {
  
  onPageAnnotationSet : function(aURI, aName) { },
  
  onItemAnnotationSet : function(aItemId, aName) {
    switch (aName) {
      case USc_places.ANNO_ROOT:
        USc_updatescan.tree.place = "place:queryType=1&folder=" + aItemId;
        break;
      case USc_places.ANNO_STATUS:
        USc_updatescan.tree.getResultView().invalidateAll();
        break;
    }
  },
  
  onPageAnnotationRemoved : function(aURI, aName) { },
  
  onItemAnnotationRemoved : function(aItemId, aName) { }
  
};


}
