var map = L.map("map", {
  zoomControl: false,
}).setView([41.56333590860899, 60.6287762595498], 13);

const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);



var sess = wialon.core.Session.getInstance(); // get instance of current Session

var exportPropsWLP = {
  // generate needed res props system data
  prop_types: {
    poi: {
      library: "resourcePois",
      dataFlag: wialon.item.Resource.dataFlag.poi,
      accessFlag: wialon.item.Resource.accessFlag.viewPoi,
      methodGetItem: "getPoi",
      methodGetCollection: "getPois",
      methodGetCollectionData: "getPoisData",
      printName: "POIs"
    },
    zones: {
      library: "resourceZones",
      dataFlag: wialon.item.Resource.dataFlag.zones,
      accessFlag: wialon.item.Resource.accessFlag.viewZones,
      methodGetItem: "getZone",
      methodGetCollection: "getZones",
      methodGetCollectionData: "getZonesData",
      printName: "Geofences"
    },
    jobs: {
      library: "resourceJobs",
      dataFlag: wialon.item.Resource.dataFlag.jobs,
      accessFlag: wialon.item.Resource.accessFlag.viewJobs,
      methodGetItem: "getJob",
      methodGetCollection: "getJobs",
      methodGetCollectionData: "getJobsData",
      printName: "Jobs"
    },
    notifications: {
      library: "resourceNotifications",
      dataFlag: wialon.item.Resource.dataFlag.notifications,
      accessFlag: wialon.item.Resource.accessFlag.viewNotifications,
      methodGetItem: "getNotification",
      methodGetCollection: "getNotifications",
      methodGetCollectionData: "getNotificationsData",
      printName: "Notifications"
    },
    drivers: {
      library: "resourceDrivers",
      dataFlag: wialon.item.Resource.dataFlag.drivers,
      accessFlag: wialon.item.Resource.accessFlag.viewDrivers,
      methodGetItem: "getDriver",
      methodGetCollection: "getDrivers",
      methodGetCollectionData: false,
      printName: "Drivers"
    },
    trailers: {
      library: "resourceTrailers",
      dataFlag: wialon.item.Resource.dataFlag.trailers,
      accessFlag: wialon.item.Resource.accessFlag.viewTrailers,
      methodGetItem: "getTrailer",
      methodGetCollection: "getTrailers",
      methodGetCollectionData: false,
      printName: "Trailers"
    },
    reports: {
      library: "resourceReports",
      dataFlag: wialon.item.Resource.dataFlag.reports,
      accessFlag: wialon.item.Resource.accessFlag.viewReports,
      methodGetItem: "getReport",
      methodGetCollection: "getReports",
      methodGetCollectionData: "getReportsData",
      printName: "Reports"
    }
  },
  init: function () {

    // flags to specify what kind of data should be returned
    var flags = wialon.item.Item.dataFlag.base;
    for (var i in this.prop_types) {
      sess.loadLibrary(this.prop_types[i].library);
      flags = wialon.util.Number.or(flags, this.prop_types[i].dataFlag); // 64 bit OR
      $('#prop_types').append('<input type="checkbox" checked="checked" name="' + i + '"> ' + this.prop_types[i].printName + '<br>'); // construct prop types checkboxes
    }

    // Subscribe on resource data
    sess.updateDataFlags( // load items to current session
      [{ type: "type", data: "avl_resource", flags: flags, mode: 0 }], // Items specification
      function (code) { // updateDataFlags callback 
        if (code) {
          exportPropsWLP.log("Error: " + wialon.core.Errors.getErrorText(code));
          return; // exit if error code 
        }

        exportPropsWLP.res = sess.getItems("avl_resource"); // get loaded 'avl_resource's items
        for (var i = 0; i < exportPropsWLP.res.length; i++) {
          $('#resource').append('<option value="' + exportPropsWLP.res[i].getId() + '">' + exportPropsWLP.res[i].getName() + '</option>');
        }
      });

    $('#btn_export_wlp').click(exportPropsWLP.getJSON);
  },
  getResourceData: function (res_id) {
    if (!res_id) {
      alert('Empty Resource ID provided');
      return false;
    }

    var item = wialon.core.Session.getInstance().getItem(res_id); // get resource by id  
    var user_access = item.getUserAccess();
    var res = {};
    var prop_types = exportPropsWLP.prop_types;
    for (var i in prop_types) {
      if (wialon.util.Number.and(user_access, prop_types[i].accessFlag)) {
        data = item[prop_types[i].methodGetCollection]();
        if (data && Object.keys(data).length) {
          res[i] = data;
        }
      }
    }

    return res;
  },
  getJSON: function (event) {
    var res_id = $('#resource').val(),
      $filter = $('#prop_types input[type="checkbox"]:checked');

    if (!res_id) {
      alert('Select resource to export from');
      $('#resource').focus();
      return false;
    }
    if (!$filter.length) {
      alert('Select prop types to export');
      return false;
    }

    var res = wialon.core.Session.getInstance().getItem(res_id); // get resource by id
    res.data = exportPropsWLP.getResourceData(res_id);

    exportPropsWLP.log('Export start');

    var res_prop,
      res_prop_type,
      res_prop_id;

    // get all checked resource res_props
    exportPropsWLP.json = {
      type: 'avl_resource',
      version: 'b4'
    };
    wialon.core.Remote.getInstance().startBatch();
    $filter.each(function () {
      var res_prop_type = $(this).attr('name');

      for (var i in res.data[res_prop_type]) {
        // get res_prop by calling methodGetItem for specific res_prop_type on resource with res_id
        res_prop_id = res.data[res_prop_type][i].id;
        res_prop = res[exportPropsWLP.prop_types[res_prop_type].methodGetItem](res_prop_id);

        var methodGetPropData = exportPropsWLP.prop_types[res_prop_type].methodGetCollectionData;
        if (methodGetPropData) {
          // get full data for prop and apply handler setJSON with params to handle data
          res[methodGetPropData]([res_prop], function (code, data) {
            exportPropsWLP.setJSON.apply(exportPropsWLP, [{ id: [res_prop_type, res_prop_id] }, code, data]);
          });
        }
        else {
          exportPropsWLP.setJSON({ id: [res_prop_type, res_prop_id] }, 0, [res_prop]);
        }
      }
    });
    wialon.core.Remote.getInstance().finishBatch(exportPropsWLP.doneJSON);
  },
  setJSON: function (prop, code, data) {
    if (typeof data == "undefined") {
      exportPropsWLP.log('Empty data');
      exportPropsWLP.log('Args length: ' + arguments.length);
      return;
    }
    if ($.isArray(data)) {
      if (typeof this.json[prop.id[0]] == "undefined") {
        this.json[prop.id[0]] = [];
      }
      for (var i = 0; i < data.length; i++) {
        if (data[i]) {
          this.json[prop.id[0]].push(data[i]);
        }
      }
    }
    else {
      this.json[prop.id[0]] = data;
    }
  },
  doneJSON: function () {
    // get filename for export file
    var filename = $('#export_filename').val();

    // send wlp to browser
    wialon.core.Uploader.getInstance().uploadFiles([], "exchange/export_json", { json: exportPropsWLP.json, fileName: filename });

    exportPropsWLP.log('Export finished');
  },
  log: function (msg) {
    var $log = $('#log'),
      $log_cont = $('#log_cont');

    $log.append('<tr><td>' + msg + '</td></tr>');

    $log_cont.animate({
      scrollTop: $log_cont[0].scrollHeight
    }, 300);
  }
}


// execute when DOM ready
$(document).ready(function () {
  wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com"); // init session
  // For more info about how to generate token check
  // http://sdk.wialon.com/playground/demo/app_auth_token
  wialon.core.Session.getInstance().loginToken("5dce19710a5e26ab8b7b8986cb3c49e58C291791B7F0A7AEB8AFBFCEED7DC03BC48FF5F8", "", // try to login
    function (code) { // login callback
      if (code) {
        exportPropsWLP.log(wialon.core.Errors.getErrorText(code));
        return; // exit if error code
      }
      exportPropsWLP.init(); // when login suceed then run init() function
    });
});


