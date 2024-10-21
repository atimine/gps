////////// MAP
const map = L.map('map', {
  zoomControl: false
}).setView([51.505, -0.09], 13);

const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);



let unit = document.querySelector('#get-units')

unit.addEventListener('change', () => {
  let pos = getSelectedUnitInfo().pos,
    myIcon = L.icon({
      iconUrl: `${getSelectedUnitInfo().icon}`,
      iconSize: [38, 38],
      iconAnchor: [22, 94],
      popupAnchor: [-3, -76],
    });

  if (getSelectedUnitInfo()) {
    let layer = L.marker([pos.x, pos.y], { icon: myIcon }).addTo(map);
    map.setView([pos.x, pos.y], 8)

    var popup = L.popup([pos.x + 0.45, pos.y], {
      content: `
        <p><b>Driver name:</b> ${getSelectedUnitInfo().text}</p>
        <p><b>Last message time:</b> ${getSelectedUnitInfo().time}</p>
        <p><b>Position:</b> ${pos.x} ${pos.y}</p>
        <p><b>Speed:</b> ${pos.s}</p>
        `
    })
      .openOn(map)

    layer.on('click', (event) => {
      L.popup([event.latlng.lat + 0.45, event.latlng.lng], {
        content: `
          <p><b>Driver name:</b> ${getSelectedUnitInfo().text}</p>
          <p><b>Last message time:</b> ${getSelectedUnitInfo().time}</p>
          <p><b>Position:</b> ${pos.x} ${pos.y}</p>
          <p><b>Speed:</b> ${pos.s}</p>

          `
      })
        .openOn(map)
    });

  }
})





var sess = wialon.core.Session.getInstance(); // get instance of current Session


// Print message to log
function msg(text, selector, userName = '') {
  let logInTitle = document.querySelector('.log-in-title'),
    logIn = document.querySelector('#log-in'),
    changeUnitLog = document.querySelector('#change-unit-log'),
    getmessageslog = document.querySelector('#get-messages-log'),
    getResource = document.querySelector('#get-resource')

  if (selector == '#log-in') {
    logIn.classList.remove('none')
    logIn.textContent = text
    logInTitle.textContent = userName !== '' ? `User name: ${userName}` : 'Please log in'

    if (text == 'Logout successfully' || text == 'Logged successfully') {
      setTimeout(() => {
        logIn.classList.add('none')
      }, 5000);
    }
  }

  if (selector == '#change-unit-log') {
    changeUnitLog.textContent = text
  }

  if (selector == '#get-messages-log') {
    getmessageslog.textContent = text
  }

  if (selector == '#get-resource') {
    getResource.textContent = text
  }

}

/////////////// LOG-IN SECTION


// Login to server using entered username and password
function login() {

  var user = sess.getCurrUser(); // get current User
  if (user) { // if user exists - you are already logged, print username to log
    msg("You are logged as '" + user.getName() + "', click logout button first", "#log-in", getUser());
    return;
  }

  console.log(sess);

  // if not logged
  var token = $("#token").val(); // get token from input
  if (!token) { // if token is empty - print message to log
    msg("Enter token", "#log-in");
    return;
  }

  msg("Trying to login with token '" + token.slice(0, 40) + "...'", "#log-in");
  sess.initSession("https://hst-api.wialon.com"); // initialize Wialon session
  sess.loginToken(token, "", // trying login 
    function (code) { // login callback
      if (code) msg(wialon.core.Errors.getErrorText(code), "#log-in"); // login failed, print error
      else msg("Logged successfully", "#log-in", getUser()); // login succeed
    }
  );

}

// Logout
function logout() {
  var user = wialon.core.Session.getInstance().getCurrUser(); // get current user
  if (!user) { msg("You are not logged, click 'login' button", "#log-in"); return; }
  wialon.core.Session.getInstance().logout( // if user exist - logout
    function (code) { // logout callback
      if (code) msg(wialon.core.Errors.getErrorText(code), "#log-in"); // logout failed, print error
      else msg("Logout successfully", "#log-in", getUser()); // logout suceed
    }
  );
}

// Get current user and prints its name to log
function getUser() {
  var user = wialon.core.Session.getInstance().getCurrUser(); // get current user
  // print message 
  if (!user) msg("You are not logged, click 'login' button", "#log-in"); // user not exists
  else msg("You are logged as '" + user.getName() + "'", "#log-in"); // print current user name
  return user.getName()
}

///////////////

/////////////// GET-UNITS SECTION

function initGetUnits() { // Execute after login succeed
  // flags to specify what kind of data should be returned
  var flags = wialon.item.Item.dataFlag.base | wialon.item.Unit.dataFlag.lastMessage;

  sess.loadLibrary("itemIcon"); // load Icon Library	
  sess.updateDataFlags( // load items to current session
    [{ type: "type", data: "avl_unit", flags: flags, mode: 0 }], // Items specification
    function () { // updateDataFlags callback
      // get loaded 'avl_unit's items  
      var units = sess.getItems("avl_unit");
      if (!units || !units.length) { msg("Units not found"); return; } // check if units found


      for (var i = 0; i < units.length; i++) { // construct Select object using found units
        var u = units[i]; // current unit in cycle
        // append option to select
        $("#get-units").append("<option value='" + u.getId() + "'>" + u.getName() + "</option>");
      }

      $("#get-units").change(getSelectedUnitInfo);


      for (var i = 0; i < units.length; i++) { // construct objects using found units
        var id = units[i].getId(); // get selected unit id
        // add unit row to table
        $("#units_table").append("<tr" + (i % 2 == 0 ? " class='odd' " : "") + "><td>" + (i + 1) + "</td>" +
          "<td><img id='icon_" + id + "'src='" + units[i].getIconUrl() + "' alt='icon'/></td>" +
          "<td>" + units[i].getName() + "</td></tr>");
        // append option to select
        $("#change-unit").append("<option value='" + units[i].getId() + "'>" + units[i].getName() + "</option>");
        // bind action to 'changeIcon' event
        units[i].addListener("changeIcon", iconUpdated);
      }



      for (var i = 0; i < units.length; i++) {
        $("#get-messages").append("<option value='" + units[i].getId() + "'>" + units[i].getName() + "</option>");
      }

    }
  );

  ///////////////  RESOURCE SECTION

  function initGetResource() {
    var flags = wialon.item.Item.dataFlag.base | wialon.item.Item.dataFlag.billingProps;
    sess.loadLibrary("resourceAccounts");
    sess.updateDataFlags(
      [{ type: "type", data: "avl_resource", flags: flags, mode: 0 }],
      function (code) {
        if (code) { msg(wialon.core.Errors.getErrorText(code)); return; }
        var res = sess.getItems("avl_resource");
        if (!res || !res.length) { msg("No resources found"); return; }
        for (var i = 0; i < res.length; i++)
          $("#get-res").append("<option value='" + res[i].getId() + "'>" + res[i].getName() + "</option>");

        $("#get-res").change(showInfo);
      });
  };
  initGetResource()

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


  function isAccount(res) {
    return res.getId() == res.getAccountId();
  }

  let accBtn = document.querySelector('.acc-btn'),
    notAccBtn = document.querySelector('.notacc-btn'),
    btnsForAcc = document.querySelector('.btns-for-acc'),
    notaccDiv = document.querySelector('.notacc-div'),
    accDiv = document.querySelector('.acc-div')


  btnsForAcc.addEventListener('click', (event) => {
    let btn = event.target
    if (accBtn == btn) {
      notAccBtn.classList.remove('active')
      accBtn.classList.add('active')
      notaccDiv.style.display = 'none'
      accDiv.style.display = 'block'
      accDiv.classList.add('anim')
    }
    if (notAccBtn == btn) {
      accBtn.classList.remove('active')
      notAccBtn.classList.add('active')
      accDiv.style.display = 'none'
      notaccDiv.style.display = 'block'
      notaccDiv.classList.add('anim')
    }

  })

  ///////////////

  ///////////////  CHANGE-UNIT-ICON SECTION

  function iconUpdated(evt) { //'changeIcon' event action
    var unit = evt.getTarget(); // get unit
    $("#icon_" + unit.getId()).attr("src", unit.getIconUrl()); //set new icon
    msg("'" + unit.getName() + "' icon updated", '#change-unit-log'); // print message
  }


  setTimeout(() => {
    console.log(sess.getMessagesLoader());
  }, 100000);
}

function changeIcon() { // change icon to selected unit
  var unit = $("#change-unit").val(); // get selected unit id
  if (!unit) { msg("Select unit", '#change-unit-log'); return; } // exit if unit not selected
  if (!$("#upload_icon").val()) { msg("Select icon", '#change-unit-log'); return; } // exit if icon not selected

  var u = wialon.core.Session.getInstance().getItem(unit); // get unit by id
  // update icon
  u.updateIcon($("#upload_icon").get(0), function (code) { // update icon callback
    if (code) { msg(wialon.core.Errors.getErrorText(code), '#change-unit-log'); return; } // if error
  });
}

///////////////

function getSelectedUnitInfo() { // print information about selected Unit

  var val = $("#get-units").val(); // get selected unit id
  if (!val) return; // exit if no unit selected

  var unit = wialon.core.Session.getInstance().getItem(val); // get unit by id
  if (!unit) { msg("Unit not found"); return; } // exit if unit not found

  // construct message with unit information
  var text = unit.getName(); // get unit name
  var icon = unit.getIconUrl(32); // get unit Icon url
  var pos = unit.getPosition(); // get unit position
  var time = wialon.util.DateTime.formatTime(pos.t);

  if (pos) { // check if position data exists
    // try to find unit location using coordinates 
    wialon.util.Gis.getLocations([{ lon: pos.x, lat: pos.y }], function (code, address) {
      if (code) { msg(wialon.core.Errors.getErrorText(code)); return; } // exit if error code
      msg(text + "<br/><b>Location of unit</b>: " + address + "</div>"); // print message to log
    });
  } else // position data not exists, print message
    msg(text + "<br/><b>Location of unit</b>: Unknown</div>");

  if (unit) {
    return { pos, text, time, icon }
  }
}

///////////////

/////////////// GET-MESSAGES SECTION


function loadMessages() { // load messages function
  var to = sess.getServerTime(); // get ServerTime, it will be end time
  var from = to - 3600 * 24; // get begin time ( end time - 24 hours in seconds )

  var unit = $("#get-messages").val(); // get selected unit id
  if (!unit) { msg("Select unit first", '#get-messages-log'); return; } // exit if no unit selected
  var ml = sess.getMessagesLoader(); // get messages loader object for current session


  ml.loadInterval(unit, from, to, 0, 0, 100, // load messages for given time interval
    function (code, data) { // loadInterval callback
      if (code) { msg(wialon.core.Errors.getErrorText(code), '#get-messages-log'); return; } // exit if error code
      else { msg(data.count + " messages loaded. Click 'Show messages'", '#get-messages-log'); } // print success message 
    }
  );
}

function showMessages(from, to) { // print given indicies (from, to) of messages 
  $("#messages").html(""); // clear message container
  // get messages loader object for current session
  var ml = wialon.core.Session.getInstance().getMessagesLoader();
  ml.getMessages(from, to, //get messages data for given indicies
    function (code, data) { // getMessages callback
      if (code) { msg(wialon.core.Errors.getErrorText(code), '#get-messages-log'); return; } // exit if error code
      else if (data.length == 0) { // exit if no messages loaded
        msg("Nothing to show. Load messages first", '#get-messages-log'); return;
      }

      for (var i = 0; i < data.length; i++) // display result cycle
        $("#messages").append(
          `
          <div style="border: 1px solid wheat; border-radious: 10px">
            <p>${data[i].f}</p>
            <p>${data[i].lc}</p>
            <p>${data[i].p}</p>
            <p>${data[i].pos.c + ' | ' + data[i].pos.s + ' | ' + data[i].pos.sc + ' | ' + data[i].pos.x + ' | ' + data[i].pos.y + ' | ' + data[i].pos.z}</p>
            <p>${data[i].rt}</p>
            <p>${data[i].t}</p>
            <p>${data[i].tp}</p>
          </div>
          `
        );
      msg(data.length + " messages shown from " + from + " to " + to, '#get-messages-log'); // Print message to log
    }
  );
}

///////////////

/////////////// GET-TOKEN

// Wialon site dns
var dns = "https://hosting.wialon.com";

// Main function
function getToken() {
  // construct login page URL
  var url = dns + "/login.html"; // your site DNS + "/login.html"
  url += "?client_id=" + "App";	// your application name
  url += "&access_type=" + 0x100;	// access level, 0x100 = "Online tracking only"
  url += "&activation_time=" + 0;	// activation time, 0 = immediately; you can pass any UNIX time value
  url += "&duration=" + 604800;	// duration, 604800 = one week in seconds
  url += "&flags=" + 0x1;			// options, 0x1 = add username in response

  url += "&redirect_uri=" + dns + "/post_token.html"; // if login succeed - redirect to this page

  // listen message with token from login page window
  window.addEventListener("message", tokenRecieved);

  // finally, open login page in new window
  window.open(url, "_blank", "width=750, height=500, top=300, left=500");
}

// Help function
function tokenRecieved(e) {
  // get message from login window
  var msg = e.data;
  if (typeof msg == "string" && msg.indexOf("access_token=") >= 0) {
    // get token
    var token = msg.replace("access_token=", "");
    // now we can use token, e.g show it on page
    document.getElementById("get-token").value = token;
    document.getElementById("get-token").removeAttribute('disabled');
    document.getElementById("get-token-login").setAttribute("disabled", "");

    // or login to wialon using our token
    wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com");

    wialon.core.Session.getInstance().loginToken(token, "", function (code) {
      if (code)
        return;
      var user = wialon.core.Session.getInstance().getCurrUser().getName();
      alert("Authorized as " + user);
    });

    // remove "message" event listener
    window.removeEventListener("message", tokenRecieved);
  }
}

///////////////

/////////////// GET-RESOURCES

///////////////


// execute when DOM ready
$(document).ready(function () {


  $("#login_btn").click(login);
  $("#logout_btn").click(logout);

  $("#change_icon_btn").click(changeIcon); // bind action to button click

  $("#load_btn").click(loadMessages);
  $("#show_btn").click(function () { showMessages($("#show_from").val(), $("#show_to").val()); });

  wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com"); // init session
  // For more info about how to generate token check
  // http://sdk.wialon.com/playground/demo/app_auth_token
  wialon.core.Session.getInstance().loginToken("3381410ea8ad64936a7025c77f892366C64ADDA8A5895F782FEE8C7A2D54F3F28C008217",
    function (code) { // login callback
      // if error code - print error message
      if (code) { msg(wialon.core.Errors.getErrorText(code)); return; }
      msg("Logged successfully");

      initGetUnits(); // when login suceed then run init() function

    }
  );
});

function clickCopy() {
  let getToken = document.querySelector('#get-token')

  getToken.select()
  getToken.setSelectionRange(0, 99999);

  navigator.clipboard.writeText(getToken.value);
}