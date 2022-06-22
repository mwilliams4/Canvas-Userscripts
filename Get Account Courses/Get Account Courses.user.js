// ==UserScript==
// @name         Get Account Courses
// @namespace    mw784
// @version      1
// @license      MIT
// @description  Gets courses for an account and exports to CSV
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/accounts/*
// @include      https://newcastle.test.instructure.com/accounts/*
// @include      https://newcastle.beta.instructure.com/accounts/*
// ==/UserScript==

(function () {
  "use strict";

  const accountId = getAccountId();

  const uniqueLinkId = "mw_export_courses";

  if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      addButton("Export Courses", "icon-download")
    );
  } else {
    addButton("Export Courses", "icon-download");
  }

  function addButton(buttonText, buttonIcon) {
    var parent;
    if (document.getElementById(uniqueLinkId)) return;

    parent = document.querySelector(
      "#wrapper > div.ic-app-nav-toggle-and-crumbs.no-print"
    );
    if (!parent) return;

    const anchor = document.createElement("a");
    anchor.classList.add("btn");
    anchor.id = uniqueLinkId;
    anchor.addEventListener("click", () => {
      processRequest();
    });
    const icon = document.createElement("i");
    icon.classList.add(buttonIcon);
    anchor.appendChild(icon);
    anchor.appendChild(document.createTextNode(` ${buttonText}`));
    parent.appendChild(anchor);
    return;
  }

  async function getAccount() {
    var url = `${window.location.origin}/api/v1/accounts/${accountId}`;
    var settings = {
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    };

    const response = await fetch(url, settings);

    if (!response.ok) {
      return false;
    }

    const account = await response.json();

    return account;
  }

  async function processRequest() {
    toggleLoadingSpinner();
    const courses = await getCourses();
    var csvArr = [];
    var date;

    if (courses.length === 0) {
      toggleLoadingSpinner();
      alert("No courses found.");
      return;
    }

    const filteredCourses = courses.map((course) => {
      date = new Date(course.created_at);
      return {
        id: course.id,
        sis_course_id: course.sis_course_id,
        course_code: course.course_code,
        name: course.name,
        workflow_state: course.workflow_state,
        created_at: date.toLocaleString(),
        account_name: course.account_name,
        "term.name": course.term.name,
        "term.sis_term_id": course.term.sis_term_id,
      };
    });

    const headers = Object.keys(filteredCourses[0]);
    csvArr.push(
      headers,
      ...filteredCourses.map((course) => Object.values(course))
    );

    const account = await getAccount();
    const fileName = account.name;

    exportToCsv(fileName, csvArr);
    toggleLoadingSpinner();
  }

  async function getCourses() {
    var courses = [];
    var urls = [];
    const asyncRequests = 25;
    var flag = false;
    var iteration = 0;
    const maxIterations = 15;

    while (flag === false) {
      urls = [...Array(asyncRequests)].map(
        (e, i) =>
          `${
            window.location.origin
          }/api/v1/accounts/${accountId}/courses?per_page=100&include[]=term&include[]=account_name&page=${
            iteration * asyncRequests + i + 1
          }`
      );
      try {
        var settings = {
          headers: {
            "X-CSRFToken": getCsrfToken(),
          },
        };

        var data = await Promise.all(
          urls.map((url) =>
            fetch(url, settings).then((response) => {
              return response.json().then((responseJSON) => {
                if (responseJSON.length === 0) flag = true;
                return responseJSON;
              });
            })
          )
        );

        courses = [...courses, ...data.flat()];

        console.log(
          `Fetched from pages ${iteration * asyncRequests + 1} to ${
            iteration * asyncRequests + asyncRequests
          }.`
        );

        iteration++;
        if (iteration >= maxIterations) {
          alert("Max iterations reached.");
          flag = true;
        }
      } catch (error) {
        console.log(error);
        toggleLoadingSpinner();
        throw error;
      }
    }

    return courses;
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

  function getAccountId() {
    let id = false;
    const courseRegex = new RegExp("^/accounts/([0-9]+)");
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

  function checkIds() {
    if (Number(accountId)) {
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
})();
