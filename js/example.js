////////// MAP
const map = L.map('map', {
  zoomControl: false
}).setView([51.505, -0.09], 13);

const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

var sess = wialon.core.Session.getInstance(); // get instance of current Session

function initGetResource() { // Execute after login succeed
  // flags to specify what kind of data should be returned
  var flags = wialon.item.Item.dataFlag.base | wialon.item.Item.dataFlag.billingProps;
  sess.loadLibrary("resourceAccounts"); // load Accounts Library
  sess.updateDataFlags( // load items to current session
    [{ type: "type", data: "avl_resource", flags: flags, mode: 0 }], // Items specification
    function (code) { // updateDataFlags callback
      if (code) { msg(wialon.core.Errors.getErrorText(code)); return; } // exit if error code
      var res = sess.getItems("avl_resource"); // get loaded 'avl_resource' items
      if (!res || !res.length) { msg("No resources found"); return; } // check if resources found
      for (var i = 0; i < res.length; i++) // construct Select list using found resources
        $("#get-res").append("<option value='" + res[i].getId() + "'>" + res[i].getName() + "</option>");
      // bind action to select change
      $("#get-res").change(showInfo);
    });
};

function showInfo() {
  var res_id = $("#get-res").val(),
    accHeader = document.querySelector('.acc-header'),
    notAccText = document.querySelector('.notacc-text'),
    grResAcc = document.querySelector('.gr-res-acc'),
    grPaln = document.querySelector('.gr-plan'),
    grBalance = document.querySelector('.gr-balance')

  if (!res_id) { msg("Select resource"); return; }
  var res = wialon.core.Session.getInstance().getItem(res_id);
  if (isAccount(res))
    accHeader.innerHTML = `<h5>${res.getName()}</h5>`
  else
    notAccText.innerHTML = res.getName()

  res.getAccountData(function (code, data) {
    if (code) { msg(wialon.core.Errors.getErrorText(code)); return; }

    grResAcc.innerHTML = `<b>${res.getName()}</b>` + (data.enabled ? " is enabled" : "blocked")
    grPaln.innerHTML = `<b>${data.plan}</b>`
    if (+data.balance[0] == '€' && +data.balance.slice(1) !== 0) {
      grBalance.innerHTML = `<b>${+data.balance.slice(1) * 13938} Sum</b>`
    } else {
      grBalance.innerHTML = `<b>${+data.balance.slice(1)} Sum</b>`
    }

  });
}


function isAccount(res) { // check if resource is account
  return res.getId() == res.getAccountId();
}

// execute when DOM ready
$(document).ready(function () {
  wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com"); // init session
  // For more info about how to generate token check
  // http://sdk.wialon.com/playground/demo/app_auth_token
  wialon.core.Session.getInstance().loginToken("3381410ea8ad64936a7025c77f892366C64ADDA8A5895F782FEE8C7A2D54F3F28C008217", "", // try to login
    function (code) { // login callback
      if (code) { msg(wialon.core.Errors.getErrorText(code)); return; } // exit if error code
      initGetResource();
    });
});