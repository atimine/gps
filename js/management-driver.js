var map = L.map("map", {
  zoomControl: false,
}).setView([41.56333590860899, 60.6287762595498], 13);

const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

var sess = wialon.core.Session.getInstance(); // get instance of current Session

var createDriver = {

  init: function () {
    var self = this;
    this.res = null;

    this.log("Logged successfully");
    sess.loadLibrary("resourceDrivers");

    // fetch data of resurse
    this.getResurse();

    this.addEventListeners();
  },

  addEventListeners: function () {
    var self = this;

    $('#resource-managment-driver').on('change', function () {
      self.getDrivers();
    });
    $('#drivers').on('change', function () {
      self.getDriverInfo();
    });

    $('#create').on('click', function () {
      self.createDriver();
    });


    $('#update').on('click', function () {
      self.updateDriver();
    });

    $('#delete').on('click', function () {
      self.deleteDriver();
    });

  },

  resetForm: function () {
    this.curRes = null;
    $('#drivers').html('<option value="">Select driver</option>');
    $('#driver_data input[type="text"], #drivers').val('');
  },

  getResurse: function () {
    // flags to specify what kind of data should be returned
    var flags = wialon.util.Number.or(wialon.item.Item.dataFlag.base, wialon.item.Resource.dataFlag.drivers, wialon.item.Resource.dataFlag.driverUnits); // 64 bit OR
    // Subscribe on resource data
    sess.updateDataFlags( // load items to current session
      [{ type: "type", data: "avl_resource", flags: flags, mode: 0 }], // Items specification
      function (code) { // updateDataFlags callback 
        if (code) {
          this.log("Error: " + wialon.core.Errors.getErrorText(code));
          return; // exit if error code 
        }

        var ress = sess.getItems("avl_resource"); // get loaded 'avl_resource's items
        $('#resource-managment-driver').html('<option value="">Select resource</option>');
        for (var i = 0; i < ress.length; i++) {
          $('#resource-managment-driver').append('<option value="' + ress[i].getId() + '">' + ress[i].getName() + '</option>');
        }
      });
  },

  getDrivers: function () {
    var self = this;
    // save resurse ID to private vearible
    this.resId = $('#resource-managment-driver').val();

    if (!this.resId) {
      this.resetForm();
      return;
    }

    var $drivers = $('#drivers');

    if (!this.resId) {
      $drivers.val('');
      return;
    }

    // save current resurse ID to private vearible
    this.curRes = sess.getItem(this.resId);

    var drivers = sess.getItem(this.resId).getDrivers()
    $drivers.html('<option value="">Select driver</option>');
    for (var i in drivers) {
      $drivers.append('<option value="' + drivers[i].id + '">' + drivers[i].n + '</option>');
    }

  },
  getDriverInfo: function () {

    var driverId = $('#drivers').val();


    if (!driverId) {
      this.resetForm();
      return;
    }

    if (!driverId) return;


    var driver = this.curRes.getDriver(driverId);

    var $form = $('#driver_data');

    // set value of inputs. base on attribute "name"
    for (var i in driver) {
      $form.find('input[name="' + i + '"]').val(driver[i] || '');
    }

  },
  createDriver: function () {
    var self = this;

    if (!this.curRes) {
      this.log('Please select Resource');
      return;
    }
    // create object
    var newDriver = {
      "itemId": this.curRes.getId(), // resourceId
      "id": 0, // item_id
      "callMode": "create",
      "c": "", // driver code
      "ck": 0, // image checksum
      "ds": $('#driver_data [name="ds"]').val() || "", // description
      "n": $('#driver_data [name="n"]').val() || "", // name
      "p": $('#driver_data [name="p"]').val() || "", // phone
      "r": 1, // image aspect ratio
      "f": 0, // flags
      "jp": {} // additional fields
    }
    // create
    this.curRes.createDriver(newDriver, function (code, data) {
      self.log('Driver ' + ((data && typeof data.n != 'undefined') ? "'" + data.n + "'" : '') + ' create result:  ' + (code ? 'Error(' + code + ')' : 'Ok'));
    });
    // reset form
    $('#resource-managment-driver').val('');
    this.resetForm();

  },
  updateDriver: function () {
    var self = this;
    var id = $('#driver_data input[name="id"]').val();
    if (!id) {
      this.log('Error update driver\'s data: id = "' + id + '"');
      return;
    }


    var updateDriver = {
      "itemId": this.curRes.getId(),
      "callMode": "update",
      c: "",
      ck: 0,
      f: 0,
      p: "",
      r: 0
    }

    // fetch data
    $('#driver_data input[type="text"]').each(function () {
      if ($(this).val()) {
        if ($(this).attr('name') == 'id') {
          updateDriver[$(this).attr('name')] = parseInt($(this).val());
        } else {
          updateDriver[$(this).attr('name')] = $(this).val();
        }
      }
    });

    this.curRes.updateDriver(updateDriver, function (code, data) {
      self.log('Driver ' + ((data && typeof data.n != 'undefined') ? "'" + data.n + "'" : '') + ' update result:  ' + (code ? 'Error(' + code + ')' : 'Ok'));
    });

    $('#resource-managment-driver').val('');
    this.resetForm();
  },
  deleteDriver: function () {
    var self = this;
    var id = $('#driver_data [name="id"]').val();

    if (!id) return;

    // confirm user for delete property;
    var answer = confirm('Do you really want to delete driver "' + $("#driver_data [name='n']").val() + '"?');
    if (!answer) return;

    this.curRes.deleteDriver(id, function (code, data) {
      self.log('Driver ' + ((data && typeof data.n != 'undefined') ? "'" + data.n + "'" : '') + ' delete result:  ' + (code ? 'Error(' + code + ')' : 'Ok'));
    });
    $('#resource-managment-driver').val('');
    this.resetForm();
  },
  log: function (msg) {
    var $log = $('#log-management-driver'),
      $log_cont = $('#log_cont');

    $log.append('<tr><td>' + msg + '</td></tr>');

    $log_cont.animate({
      scrollTop: $log_cont[0].scrollHeight
    }, 300);
  }
};


// execute when DOM ready
$(document).ready(function () {

  wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com"); // init session
  // For more info about how to generate token check
  // http://sdk.wialon.com/playground/demo/app_auth_token
  wialon.core.Session.getInstance().loginToken("5dce19710a5e26ab8b7b8986cb3c49e58C291791B7F0A7AEB8AFBFCEED7DC03BC48FF5F8", "", // try to login
    function (code) { // login callback
      if (code) {
        createDriver.log(wialon.core.Errors.getErrorText(code));
        return; // exit if error code
      }
      createDriver.init(); // when login suceed then run init() function
    });
});


