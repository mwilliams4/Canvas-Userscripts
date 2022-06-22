// ==UserScript==
// @name         Export Gradebook History
// @namespace    mw784
// @version      1
// @license      MIT
// @description  Exports Gradebook history to CSV file
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/courses/*/gradebook/history
// @include      https://newcastle.test.instructure.com/courses/*/gradebook/history
// @include      https://newcastle.beta.instructure.com/courses/*/gradebook/history
// ==/UserScript==

(function () {
  "use strict";

  const courseId = getCourseId();

  const uniqueLinkId = "mw_export_all";
  const uniqueLinkIdByStudent = "mw_export_by_student";
  const uniqueDialogId = "mw_export_gradebook_dialog";

  function addButtons(buttonText, buttonIcon) {
    var parent;
    if (
      document.getElementById(uniqueLinkId) ||
      document.getElementById(uniqueLinkIdByStudent)
    )
      return;
    parent = document.querySelector(
      "#wrapper > div.ic-app-nav-toggle-and-crumbs.no-print"
    );
    if (!parent) return;

    var anchor = document.createElement("a");
    anchor.classList.add("btn");
    anchor.id = uniqueLinkId;
    anchor.addEventListener("click", () => {
      processRequest();
    });
    var icon = document.createElement("i");
    icon.classList.add(buttonIcon);
    anchor.appendChild(icon);
    anchor.appendChild(document.createTextNode(` ${buttonText}`));
    parent.appendChild(anchor);

    var anchor = document.createElement("a");
    anchor.classList.add("btn");
    anchor.id = uniqueLinkIdByStudent;
    anchor.addEventListener("click", () => {
      openDialog();
    });
    anchor.style.margin = "5px";
    var icon = document.createElement("i");
    icon.classList.add(buttonIcon);
    anchor.appendChild(icon);
    anchor.appendChild(document.createTextNode(` Export by Student`));
    parent.appendChild(anchor);

    return;
  }

  function createDialog() {
    var el = document.querySelector(`#${uniqueDialogId}`);
    if (!el) {
      el = document.createElement("div");
      el.id = uniqueDialogId;
      el.classList.add("ic-Form-control");
      var label = document.createElement("label");
      label.htmlFor = "mw_export_gradebook_text";
      label.textContent = "Student ID";
      label.classList.add("ic-Label");
      el.appendChild(label);
      var textarea = document.createElement("textarea");
      textarea.setAttribute("rows", "1");
      textarea.id = "mw_export_gradebook_text";
      textarea.classList.add("ic-Input");
      textarea.placeholder = `Enter Student ID here..`;
      el.appendChild(textarea);
      var msg = document.createElement("div");
      msg.id = "mw_export_gradebook_msg";
      msg.classList.add("ic-flash-warning");
      msg.style.display = "none";
      el.appendChild(msg);
      var parent = document.querySelector("body");
      parent.appendChild(el);
    }
  }

  function openDialog() {
    if (!checkId()) {
      alert("Could not determine course. Aborting.");
      return;
    }
    try {
      createDialog();

      $(`#${uniqueDialogId}`).dialog({
        title: "Export Student Gradebook History",
        autoOpen: false,
        buttons: [
          {
            text: "Cancel",
            click: closeDialog,
          },
          {
            text: "Export",
            click: checkDialog,
            class: "Button Button--primary",
          },
        ],

        modal: true,
        height: "auto",
        width: "30%",
      });
      if (!$(`#${uniqueDialogId}`).dialog("isOpen")) {
        $(`#${uniqueDialogId}`).dialog("open");
      }
    } catch (e) {
      console.log(e);
    }
  }

  function closeDialog() {
    $(`#${uniqueDialogId}`).dialog("close");
    var el = document.getElementById("mw_export_gradebook_text");
    if (el) {
      el.value = "";
    }
  }

  async function checkDialog() {
    var inputUserSISId = document
      .getElementById("mw_export_gradebook_text")
      .value.trim();

    if (/^[0-9]{7}$/.test(inputUserSISId))
      inputUserSISId = `c${inputUserSISId}`;

    const user = await getUser(inputUserSISId);

    if (!user) {
      alert("Unable to find user.");
      return false;
    }

    closeDialog();
    processRequestByStudent(user);
  }

  async function processRequestByStudent(user) {
    toggleLoadingSpinner();
    const gradeChanges = await getGradeChangeLogByStudent(user);
    var csvArr = [];
    var date;

    if (gradeChanges.length === 0) {
      toggleLoadingSpinner();
      alert("No Grade Changes found.");
      return;
    }

    const filteredGradeChanges = gradeChanges
      .filter((gradeChange) => gradeChange.links.course == courseId)
      .map((gradeChange) => {
        date = new Date(gradeChange.created_at);
        return {
          date: date.toLocaleString(),
          student_name: gradeChange.user.name,
          sis_user_id: gradeChange.user.sis_user_id,
          student_id: gradeChange.links.student,
          grader: gradeChange.grader ? gradeChange.grader.name : "",
          artefact: gradeChange.assignment
            ? gradeChange.assignment.name
            : gradeChange.course_override_grade
            ? "FINAL GRADE OVERRIDE"
            : "",
          grade_before: gradeChange.grade_before
            ? gradeChange.grade_before
            : "",
          grade_after: gradeChange.grade_after,
        };
      });

    if (filteredGradeChanges.length === 0) {
      alert(`No grade changes found for ${user.sis_user_id}.`);
      toggleLoadingSpinner();
      return;
    }

    const headers = Object.keys(filteredGradeChanges[0]);
    csvArr.push(
      headers,
      ...filteredGradeChanges.map((gradeChange) => Object.values(gradeChange))
    );

    const fileName = "gradebook_history";

    exportToCsv(fileName, csvArr);
    toggleLoadingSpinner();
    return;
  }

  async function processRequest() {
    if (!checkId()) {
      alert("Could not determine course. Aborting.");
      return;
    }
    toggleLoadingSpinner();
    const gradeChanges = await getGradeChangeLog();
    var csvArr = [];
    var date;

    if (gradeChanges.length === 0) {
      toggleLoadingSpinner();
      alert("No Grade Changes found.");
      return;
    }

    const filteredGradeChanges = gradeChanges.map((gradeChange) => {
      date = new Date(gradeChange.created_at);
      return {
        date: date.toLocaleString(),
        student_name: gradeChange.user.name,
        sis_user_id: gradeChange.user.sis_user_id,
        student_id: gradeChange.links.student,
        grader: gradeChange.grader ? gradeChange.grader.name : "",
        artefact: gradeChange.assignment
          ? gradeChange.assignment.name
          : gradeChange.course_override_grade
          ? "FINAL GRADE OVERRIDE"
          : "",
        grade_before: gradeChange.grade_before ? gradeChange.grade_before : "",
        grade_after: gradeChange.grade_after,
      };
    });

    const headers = Object.keys(filteredGradeChanges[0]);
    csvArr.push(
      headers,
      ...filteredGradeChanges.map((gradeChange) => Object.values(gradeChange))
    );

    const fileName = "gradebook_history";

    exportToCsv(fileName, csvArr);
    toggleLoadingSpinner();
    return;
  }

  async function getUser(sisUserId) {
    var url = `${window.location.origin}/api/v1/users/sis_user_id:${sisUserId}`;
    var settings = {
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    };

    const response = await fetch(url, settings);

    if (!response.ok) {
      return false;
    }

    const user = await response.json();

    return user;
  }

  async function getGradeChangeLogByStudent(user) {
    var gradeChanges = [];
    var users = [];
    var assignments = [];
    var parsedLinkHeader, url;

    url = `${window.location.origin}/api/v1/audit/grade_change/students/${user.id}?per_page=100`;

    var settings = {
      //method: 'GET',
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    };

    console.log(`Fetching current grade changes...`);
    var i = 1;
    while (url !== null) {
      const response = await fetch(url, settings);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      gradeChanges = [...gradeChanges, ...data.events];
      data.linked.users.forEach((user) => {
        if (!users.map((user) => user.id).some((id) => id === user.id))
          users.push(user);
      });
      data.linked.assignments.forEach((assignment) => {
        if (
          !assignments
            .map((assignment) => assignment.id)
            .some((id) => id === assignment.id)
        )
          assignments.push(assignment);
      });

      parsedLinkHeader = parseLinkHeader(response.headers.get("link"));

      if (parsedLinkHeader && parsedLinkHeader.next) {
        url = parsedLinkHeader.next;
      } else {
        url = null;
      }
      console.log(
        `Fetched from page ${i}. Grade changes: ${gradeChanges.length}.`
      );
      i++;
    }

    gradeChanges.forEach((gradeChange) => {
      gradeChange.user = users.find(
        (user) => user.id == gradeChange.links.student
      );
      gradeChange.grader = users.find(
        (user) => user.id == gradeChange.links.grader
      );
      gradeChange.assignment = assignments.find(
        (assignment) => assignment.id == gradeChange.links.assignment
      );
    });

    return gradeChanges;
  }

  async function getGradeChangeLog() {
    var gradeChanges = [];
    var users = [];
    var assignments = [];
    var parsedLinkHeader, url;

    url = `${window.location.origin}/api/v1/audit/grade_change/courses/${courseId}?per_page=100`;

    var settings = {
      //method: 'GET',
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    };
    console.log(`Fetching current grade changes...`);
    var i = 1;
    while (url !== null) {
      const response = await fetch(url, settings);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      gradeChanges = [...gradeChanges, ...data.events];
      data.linked.users.forEach((user) => {
        if (!users.map((user) => user.id).some((id) => id === user.id))
          users.push(user);
      });
      data.linked.assignments.forEach((assignment) => {
        if (
          !assignments
            .map((assignment) => assignment.id)
            .some((id) => id === assignment.id)
        )
          assignments.push(assignment);
      });

      parsedLinkHeader = parseLinkHeader(response.headers.get("link"));

      if (parsedLinkHeader && parsedLinkHeader.next) {
        url = parsedLinkHeader.next;
      } else {
        url = null;
      }
      console.log(
        `Fetched from page ${i}. Grade changes: ${gradeChanges.length}.`
      );
      i++;
    }

    gradeChanges.forEach((gradeChange) => {
      gradeChange.user = users.find(
        (user) => user.id == gradeChange.links.student
      );
      gradeChange.grader = users.find(
        (user) => user.id == gradeChange.links.grader
      );
      gradeChange.assignment = assignments.find(
        (assignment) => assignment.id == gradeChange.links.assignment
      );
    });

    return gradeChanges;
  }

  function exportToCsv(filename, rows) {
    var processRow = function (row) {
      var finalVal = "";
      for (var j = 0; j < row.length; j++) {
        var innerValue = row[j] === null ? "" : row[j].toString();
        if (row[j] instanceof Date) {
          innerValue = row[j].toLocaleString();
        }
        var result = innerValue.replace(/"/g, '""');
        if (result.search(/("|,|\n)/g) >= 0) result = '"' + result + '"';
        if (j > 0) finalVal += ",";
        finalVal += result;
      }
      return finalVal + "\n";
    };

    var csvFile = "";
    for (var i = 0; i < rows.length; i++) {
      csvFile += processRow(rows[i]);
    }

    var blob = new Blob([csvFile], {
      type: "text/csv;charset=utf-8;",
    });
    if (navigator.msSaveBlob) {
      // IE 10+
      navigator.msSaveBlob(blob, filename);
    } else {
      var link = document.createElement("a");
      if (link.download !== undefined) {
        // feature detection
        // Browsers that support HTML5 download attribute
        var url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        link.click();
      }
    }
  }

  function getCsrfToken() {
    var csrfRegex = new RegExp("^_csrf_token=(.*)$");
    var csrf;
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim();
      var match = csrfRegex.exec(cookie);
      if (match) {
        csrf = decodeURIComponent(match[1]);
        break;
      }
    }
    return csrf;
  }

  function getCourseId() {
    let id = false;
    const courseRegex = new RegExp("^/courses/([0-9]+)");
    const matches = courseRegex.exec(window.location.pathname);
    if (matches) {
      id = matches[1];
    }
    return id;
  }

  function parseLinkHeader(header) {
    if (header.length == 0) {
      throw new Error("input must not be of zero length");
    }

    // Split parts by comma
    var parts = header.split(",");
    var links = {};
    // Parse each part into a named link
    parts.forEach((p) => {
      var section = p.split(";");
      if (section.length != 2) {
        throw new Error("section could not be split on ';'");
      }
      var url = section[0].replace(/<(.*)>/, "$1").trim();
      var name = section[1].replace(/rel="(.*)"/, "$1").trim();
      links[name] = url;
    });

    return links;
  }

  function checkId() {
    if (Number(courseId)) {
      return true;
    } else {
      return false;
    }
  }

  function toggleLoadingSpinner() {
    const loading = document.querySelector(".loading");
    if (loading) {
      if (loading.style.display === "none")
        loading.style.removeProperty("display");
      else loading.style.display = "none";
      return;
    }

    const el = document.createElement("div");
    el.classList.add("loading");
    el.value = "Loading&#8230;";
    document.body.appendChild(el);

    var spinnerStyle = document.createElement("style");
    spinnerStyle.type = "text/css";
    spinnerStyle.innerHTML = `
    .loading {
      position: fixed;
      z-index: 999;
      height: 2em;
      width: 2em;
      overflow: visible;
      margin: auto;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
    }
    .loading:before {
      content: '';
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.3);
    }
    @-webkit-keyframes spinner {
      0% {
        -webkit-transform: rotate(0deg);
        -moz-transform: rotate(0deg);
        -ms-transform: rotate(0deg);
        -o-transform: rotate(0deg);
        transform: rotate(0deg);
      }
      100% {
        -webkit-transform: rotate(360deg);
        -moz-transform: rotate(360deg);
        -ms-transform: rotate(360deg);
        -o-transform: rotate(360deg);
        transform: rotate(360deg);
      }
      }
      @-moz-keyframes spinner {
        0% {
          -webkit-transform: rotate(0deg);
          -moz-transform: rotate(0deg);
          -ms-transform: rotate(0deg);
          -o-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(360deg);
          -moz-transform: rotate(360deg);
          -ms-transform: rotate(360deg);
          -o-transform: rotate(360deg);
          transform: rotate(360deg);
        }
      }
      @-o-keyframes spinner {
        0% {
          -webkit-transform: rotate(0deg);
          -moz-transform: rotate(0deg);
          -ms-transform: rotate(0deg);
          -o-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(360deg);
          -moz-transform: rotate(360deg);
          -ms-transform: rotate(360deg);
          -o-transform: rotate(360deg);
          transform: rotate(360deg);
        }
      }
      @keyframes spinner {
        0% {
          -webkit-transform: rotate(0deg);
          -moz-transform: rotate(0deg);
          -ms-transform: rotate(0deg);
          -o-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        100% {
          -webkit-transform: rotate(360deg);
          -moz-transform: rotate(360deg);
          -ms-transform: rotate(360deg);
          -o-transform: rotate(360deg);
          transform: rotate(360deg);
        }
      }
      .loading:not(:required):after {
        content: '';
        display: block;
        font-size: 10px;
        width: 1em;
        height: 1em;
        margin-top: -0.5em;
        -webkit-animation: spinner 1500ms infinite linear;
        -moz-animation: spinner 1500ms infinite linear;
        -ms-animation: spinner 1500ms infinite linear;
        -o-animation: spinner 1500ms infinite linear;
        animation: spinner 1500ms infinite linear;
        border-radius: 0.5em;
        -webkit-box-shadow: rgba(0, 0, 0, 0.75) 1.5em 0 0 0, rgba(0, 0, 0, 0.75) 1.1em 1.1em 0 0, rgba(0, 0, 0, 0.75) 0 1.5em 0 0, rgba(0, 0, 0, 0.75) -1.1em 1.1em 0 0, rgba(0, 0, 0, 0.5) -1.5em 0 0 0, rgba(0, 0, 0, 0.5) -1.1em -1.1em 0 0, rgba(0, 0, 0, 0.75) 0 -1.5em 0 0, rgba(0, 0, 0, 0.75) 1.1em -1.1em 0 0;
        box-shadow: rgba(0, 0, 0, 0.75) 1.5em 0 0 0, rgba(0, 0, 0, 0.75) 1.1em 1.1em 0 0, rgba(0, 0, 0, 0.75) 0 1.5em 0 0, rgba(0, 0, 0, 0.75) -1.1em 1.1em 0 0, rgba(0, 0, 0, 0.75) -1.5em 0 0 0, rgba(0, 0, 0, 0.75) -1.1em -1.1em 0 0, rgba(0, 0, 0, 0.75) 0 -1.5em 0 0, rgba(0, 0, 0, 0.75) 1.1em -1.1em 0 0;
      }
      .loading:not(:required) {
        /* hide "loading..." text */
        font: 0/0 a;
        color: transparent;
        text-shadow: none;
        background-color: transparent;
        border: 0;
      }
    `;
    document.head.appendChild(spinnerStyle);
    return;
  }

  if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      addButtons("Export History", "icon-download")
    );
  } else {
    addButtons("Export History", "icon-download");
  }
})();
