////////// MAP
// var map = L.map("map", {
//   zoomControl: false,
// }).setView([41.56333590860899, 60.6287762595498], 13);

// const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
//   maxZoom: 19
// }).addTo(map);



var sess = wialon.core.Session.getInstance(); // get instance of current Session

// Print message to log
function msg(text, selector) {
  let reportLog = document.querySelector('#report-log'),
    executeCustomReportLog = document.querySelector('#execute-custom-report-log')

  if (selector == '#report-log') {
    reportLog.textContent = text
  }

  if (selector == "#execute-custom-report-log") {
    executeCustomReportLog.innerHTML = text
  }

}

function initExecuteReport() {// Execute after login succeed
  // specify what kind of data should be returned
  var res_flags = wialon.item.Item.dataFlag.base | wialon.item.Resource.dataFlag.reports;
  var unit_flags = wialon.item.Item.dataFlag.base;

  sess.loadLibrary("resourceReports"); // load Reports Library
  sess.updateDataFlags( // load items to current session
    [{ type: "type", data: "avl_resource", flags: res_flags, mode: 0 }, // 'avl_resource's specification
    { type: "type", data: "avl_unit", flags: unit_flags, mode: 0 }], // 'avl_unit's specification
    function (code) { // updateDataFlags callback
      if (code) { msg(wialon.core.Errors.getErrorText(code), '#report-log'); return; } // exit if error code

      var res = sess.getItems("avl_resource"); // get loaded 'avl_resource's items
      if (!res || !res.length) { msg("Resources not found", '#report-log'); return; } // check if resources found
      for (var i = 0; i < res.length; i++) { // construct Select object using found resources
        $("#res-report").append("<option value='" + res[i].getId() + "'>" + res[i].getName() + "</option>");
        $("#res-execute-report").append("<option value='" + res[i].getId() + "'>" + res[i].getName() + "</option>");
        $("#res-executing-custom").append("<option value='" + res[i].getId() + "'>" + res[i].getName() + "</option>");
      }

      getTemplates(); // update report template list


      $("#res-execute-report").change(getTemplates); // bind action to select change

      var units = sess.getItems("avl_unit"); // get loaded 'avl_units's items
      if (!units || !units.length) { msg("Units not found", '#report-log'); return; } // check if units found
      for (var i = 0; i < units.length; i++) {// construct Select object using found units
        $("#execute-report-units").append("<option value='" + units[i].getId() + "'>" + units[i].getName() + "</option>");
        $("#res-executing-custom-units").append("<option value='" + units[i].getId() + "'>" + units[i].getName() + "</option>");
      }
    }
  );

  drawCheckboxes();
  $('#executing-custom-templ').change(drawCheckboxes);
}


function createReport() { // create 'unit_trips' report in selected resource
  var res_id = $("#res-report").val(); // get resource id
  var n = $("#r_name").val(); // get resource name
  var stats = $("ul li .rep_col:checked"); // get stats, that need to be in a report
  var s = "", sl = ""; // stats and statsLabels variables

  if (!res_id) { msg("Select resource", '#report-log'); return; } // exit if resource not selected
  if (!n) { msg("Enter name", '#report-log'); return; } // exit if report name not entered
  if (!stats || !stats.length) { msg("Select stats for report", '#report-log'); return; } // exit if stats not checked
  for (var i = 0; i < stats.length; i++) { // cycle to generate stats and stateLabels
    s += (s == "" ? "" : ",") + stats[i].id;
    sl += (sl == "" ? "" : ",") + stats[i].nextSibling.innerText;
  }

  var res = wialon.core.Session.getInstance().getItem(res_id); // get resource by id

  // create Report object with default values
  var obj = {
    "ct": "avl_unit", "p": "",
    "tbl": [{
      "n": "unit_trips", "l": "Поездки", "f": 0, "c": "", "cl": "", "p": "",
      "sch": { "y": 0, "m": 0, "w": 0, "f1": 0, "f2": 0, "t1": 0, "t2": 0 }
    }]
  };
  obj.n = n; // set report name
  obj.tbl[0].sl = sl; // set report stat labels
  obj.tbl[0].s = s; // set report stats

  res.createReport(obj, // create report 
    function (code) { // create report callback
      if (code) { msg(wialon.core.Errors.getErrorText(code), '#report-log'); return; } // exit if error code
      msg("<b>'" + n + "'</b> report created successfully", '#report-log'); // print create succeed message
      $("ul li .rep_col:checked").prop("checked", false); // uncheck stats
      $("#r_name").val(""); // clear report name field
    }
  );

}


// Execute report

function getTemplates() { // get report templates and put it in select list
  $("#templ").html("<option></option>"); // ad first empty element
  var res = wialon.core.Session.getInstance().getItem($("#res-execute-report").val()); // get resource by id
  // check user access to execute reports
  if (!wialon.util.Number.and(res.getUserAccess(), wialon.item.Item.accessFlag.execReports)) {
    $("#exec_btn").prop("disabled", true); // if not enough rights - disable button
    msg("Not enought rights for report execution"); return; // print message and exit
  } else $("#exec_btn").prop("disabled", false); // if enough rights - disable button

  var templ = res.getReports(); // get reports templates for resource
  for (var i in templ) {
    if (templ[i].ct != "avl_unit") continue; // skip non-unit report templates
    // add report template to select list
    $("#templ").append("<option value='" + templ[i].id + "'>" + templ[i].n + "</option>");
  }
}

function executeReport() { // execute selected report
  // get data from corresponding fields
  var id_res = $("#res-execute-report").val(), id_templ = $("#templ").val(), id_unit = $("#execute-report-units").val(), time = $("#interval").val();
  if (!id_res) { msg("Select resource"); return; } // exit if no resource selected
  if (!id_templ) { msg("Select report template"); return; } // exit if no report template selected
  if (!id_unit) { msg("Select unit"); return; } // exit if no unit selected

  var res = sess.getItem(id_res); // get resource by id
  var to = sess.getServerTime(); // get current server time (end time of report time interval)
  var from = to - parseInt($("#interval").val(), 10); // calculate start time of report
  // specify time interval object
  var interval = { "from": from, "to": to, "flags": wialon.item.MReport.intervalFlag.absolute };
  var template = res.getReport(id_templ); // get report template by id
  $("#exec_btn").prop("disabled", true); // disable button (to prevent multiclick while execute)

  res.execReport(template, id_unit, 0, interval, // execute selected report
    function (code, data) { // execReport template
      $("#exec_btn").prop("disabled", false); // enable button
      if (code) { msg(wialon.core.Errors.getErrorText(code)); return; } // exit if error code
      if (!data.getTables().length) { // exit if no tables obtained
        msg("<b>There is no data generated</b>"); return;
      }
      else showReportResult(data); // show report result
    });
}

function showReportResult(result) { // show result after report execute
  var tables = result.getTables(); // get report tables
  if (!tables) return; // exit if no tables
  for (var i = 0; i < tables.length; i++) { // cycle on tables
    // html contains information about one table
    var html = "<b>" + tables[i].label + "</b><div class='wrap'><table style='width:100%'>";

    var headers = tables[i].header; // get table headers
    html += "<tr>"; // open header row
    for (var j = 0; j < headers.length; j++) // add header
      html += "<th>" + headers[j] + "</th>";
    html += "</tr>"; // close header row
    result.getTableRows(i, 0, tables[i].rows, // get Table rows
      qx.lang.Function.bind(function (html, code, rows) { // getTableRows callback
        if (code) { msg(wialon.core.Errors.getErrorText(code)); return; } // exit if error code
        for (var j in rows) { // cycle on table rows
          if (typeof rows[j].c == "undefined") continue; // skip empty rows
          html += "<tr" + (j % 2 == 1 ? " class='odd' " : "") + ">"; // open table row
          for (var k = 0; k < rows[j].c.length; k++) // add ceils to table
            html += "<td>" + getTableValue(rows[j].c[k]) + "</td>";
          html += "</tr>";// close table row
        }
        html += "</table>";
        msg(html + "</div>");
      }, this, html)
    );
  }
}

function getTableValue(data) { // calculate ceil value
  if (typeof data == "object")
    if (typeof data.t == "string") return data.t; else return "";
  else return data;
}

// Report executing custom

function drawCheckboxes() {
  // get available reports table
  wialon.core.Session.getInstance().getReportTables(function (code, data) {
    var selectedTmpl = $("#executing-custom-templ").val();
    var col = [];
    var html = '';
    for (var i = 0; i < data.length; i++) {
      if (data[i].n == selectedTmpl) {//draw only selected report table
        col = data[i].col;
        for (var j = 0; j < col.length; j++) { // construct Select object using found report columns
          if (col[j].l != '' && col[j].n != '') {
            html += '<li><input class="rep_col" type="checkbox" id="' + col[j].n + '"/><label for="' + col[j].n + '">' + col[j].l + '</label></li>';
          }
        }
      }
    };
    $('#columns').html(html);
  });

}


function executeReportCustom() { // execute selected report
  // get data from corresponding fields
  var id_res = $("#res-executing-custom").val(),
    templ = $("#executing-custom-templ").val(),
    id_unit = $("#res-executing-custom-units").val(),
    time = $("#interval").val();
  if (!id_res) {
    msg("Select resource", '#execute-custom-report-log');
    return;
  } // exit if no resource selected
  if (!id_unit) {
    msg("Select unit", '#execute-custom-report-log');
    return;
  } // exit if no unit selected
  var res = sess.getItem(id_res); // get resource by id
  var to = sess.getServerTime(); // get current server time (end time of report time interval)
  var from = to - parseInt($("#interval").val(), 10); // calculate start time of report
  var columns = $("ul li .rep_col:checked"); // get columns, that need to be in a report
  // specify time interval object
  var interval = {
    "from": from,
    "to": to,
    "flags": wialon.item.MReport.intervalFlag.absolute
  };

  var c = "", cl = ""; // columns and columnsLabels variables
  for (var i = 0; i < columns.length; i++) { // cycle to generate columns and columnsLabels
    c += (c == "" ? "" : ",") + columns[i].id;
    cl += (cl == "" ? "" : ",") + $(columns[i].nextSibling).text();//.innerText;
  }
  $("#exec_btn").prop("disabled", true); // disable button (to prevent multiclick while execute)
  var template = {// fill template object
    "id": 0,
    "n": templ,
    "ct": "avl_unit",
    "p": "",
    "tbl": [{
      "n": templ,
      "l": $("#executing-custom-templ option[value='" + templ + "']").text(),
      "c": c,
      "cl": cl,
      "s": "",
      "sl": "",
      "p": "",
      "sch": {
        "f1": 0,
        "f2": 0,
        "t1": 0,
        "t2": 0,
        "m": 0,
        "y": 0,
        "w": 0
      },
      "f": 0
    }]
  };
  res.execReport(template, id_unit, 0, interval, // execute selected report

    function (code, data) { // execReport template
      $("#exec_btn").prop("disabled", false); // enable button
      if (code) {
        msg(wialon.core.Errors.getErrorText(code), '#execute-custom-report-log');
        return;
      } // exit if error code
      if (!data.getTables().length) { // exit if no tables obtained
        msg("<b>There is no data generated</b>", '#execute-custom-report-log');
        return;
      } else showReportResult(data); // show report result
    });
}

function showReportResult(result) { // show result after report execute
  var tables = result.getTables(); // get report tables
  if (!tables) return; // exit if no tables
  for (var i = 0; i < tables.length; i++) { // cycle on tables
    // html contains information about one table
    var html = "<b>" + tables[i].label + "</b><div class='wrap'><table style='width:100%'>";

    var headers = tables[i].header; // get table headers
    html += "<tr>"; // open header row
    for (var j = 0; j < headers.length; j++) // add header
      html += "<th>" + headers[j] + "</th>";
    html += "</tr>"; // close header row
    result.getTableRows(i, 0, tables[i].rows, // get Table rows
      function (code, rows) { // getTableRows callback
        if (code) {
          msg(wialon.core.Errors.getErrorText(code), '#execute-custom-report-log');
          return;
        } // exit if error code
        for (var j in rows) { // cycle on table rows
          if (typeof rows[j].c == "undefined") continue; // skip empty rows
          html += "<tr" + (j % 2 == 1 ? " class='odd' " : "") + ">"; // open table row
          for (var k = 0; k < rows[j].c.length; k++) // add ceils to table
            html += "<td>" + getTableValue(rows[j].c[k]) + "</td>";
          html += "</tr>"; // close table row
        }
        html += "</table>";
        msg(html + "</div>", '#execute-custom-report-log');
      },
      this, html);
  }
}

function getTableValue(data) { // calculate ceil value
  if (typeof data == "object")
    if (typeof data.t == "string") return data.t;
    else return "";
  else return data;
}


// execute when DOM ready
$(document).ready(function () {
  $("#create_btn").click(createReport); // bind action to button click

  $("#exec_btn_res-executing-custom").click(executeReportCustom); // bind action to button click


  wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com"); // init session
  // For more info about how to generate token check
  // http://sdk.wialon.com/playground/demo/app_auth_token
  wialon.core.Session.getInstance().loginToken("5dce19710a5e26ab8b7b8986cb3c49e58C291791B7F0A7AEB8AFBFCEED7DC03BC48FF5F8", "", // try to login
    function (code) { // login callback
      // if error code - print error message
      if (code) { msg(wialon.core.Errors.getErrorText(code)); return; }
      msg("Logged successfully", '#execute-custom-report-log');
      initExecuteReport()
      // initReport(); // when login suceed then run init() function
    });
});

let cardHeaderTabs = document.querySelector('.card-header-tabs'),
  navLinks = document.querySelectorAll('.nav-link'),
  reportDiv = document.querySelectorAll('.report-div')

cardHeaderTabs.addEventListener('click', (event) => {
  for (let i = 0; i < navLinks.length; i++) {
    navLinks[i].classList.remove('active')
    reportDiv[i].classList.add("active-div")
  }
  show(+event.target.id.slice(4))
})

function show(idx = 0) {
  navLinks[idx].classList.add('active')
  reportDiv[idx].classList.remove('active-div')
}

show()