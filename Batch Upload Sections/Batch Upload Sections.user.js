// ==UserScript==
// @name         Batch Upload Sections
// @namespace    mw784
// @version      1
// @license      MIT
// @description  Batch Upload Section shells direct in the settings area of a Canvas course site.
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/courses/*/settings
// @include      https://newcastle.test.instructure.com/courses/*/settings
// @include      https://newcastle.beta.instructure.com/courses/*/settings
// ==/UserScript==

(function () {
  "use strict";

  const courseId = getCourseId();
  const uniqueLinkId = "mw_section_upload";

  if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      addSectionButton("Import Course Sections", "icon-upload")
    );
  } else {
    addSectionButton("Import Course Sections", "icon-upload");
  }

  function createLoadingSpinner() {
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
  }

  function deactivateLoadingSpinner() {
    document.querySelector(".loading").style.display = "none";
  }

  function addSectionButton(linkText, iconType) {
    if (!document.getElementById(uniqueLinkId)) {
      const insBefore = document.querySelector(
        "aside#right-side > div > .import_content"
      );
      if (insBefore) {
        const anchor = document.createElement("a");
        anchor.id = uniqueLinkId;
        anchor.classList.add(
          "Button",
          "Button--link",
          "Button--link--has-divider",
          "Button--course-settings"
        );
        const icon = document.createElement("i");
        icon.classList.add(iconType);
        anchor.appendChild(icon);
        anchor.appendChild(document.createTextNode(`${linkText} `));
        anchor.addEventListener("click", openDialog);
        insBefore.parentNode.insertBefore(anchor, insBefore);
      }
    }
    return;
  }

  function createDialog() {
    var el = document.querySelector("#mw_sections_dialog");
    if (!el) {
      el = document.createElement("div");
      el.id = "mw_sections_dialog";
      el.classList.add("ic-Form-control");
      var label = document.createElement("label");
      label.htmlFor = "mw_section_text";
      label.textContent = "Section Data";
      label.classList.add("ic-Label");
      el.appendChild(label);
      var textarea = document.createElement("textarea");
      textarea.setAttribute("rows", "9");
      textarea.id = "mw_section_text";
      textarea.classList.add("ic-Input");
      textarea.placeholder = `Paste tab-delimited section data from Excel into this textbox, without headers.\n
First column should be section name, second column should be section SIS ID (optional), third column should be Student ID (optional). For example:
\nC1A \tC1A.NURS1234.2022.S1\tc1111111
C1A \tC1A.NURS1234.2022.S1\tc2222222
C1B \tC1B.NURS1234.2022.S1\tc3333333
O1A \tO1A.NURS1234.2022.S1\tc4444444
O1B \tO1B.NURS1234.2022.S1\tc5555555`;
      el.appendChild(textarea);
      var msg = document.createElement("div");
      msg.id = "mw_rubric_msg";
      msg.classList.add("ic-flash-warning");
      msg.style.display = "none";
      el.appendChild(msg);
      var parent = document.querySelector("body");
      parent.appendChild(el);
    }
  }

  function openDialog() {
    try {
      createDialog();

      $("#mw_sections_dialog").dialog({
        title: "Import Sections and Section Enrolments",
        autoOpen: false,
        buttons: [
          {
            text: "Cancel",
            click: closeDialog,
          },
          {
            text: "Import",
            click: checkDialog,
            class: "Button Button--primary",
          },
        ],

        modal: true,
        height: "auto",
        width: "80%",
      });
      if (!$("#mw_sections_dialog").dialog("isOpen")) {
        $("#mw_sections_dialog").dialog("open");
      }
    } catch (e) {
      console.log(e);
    }
  }

  function checkDialog() {
    var rawText = document.getElementById("mw_section_text");

    if (!Number(courseId)) {
      alert("Unable to determine where to import sections.");
      return;
    }

    if (rawText.value && rawText.value.trim() !== "") {
      parseDialog(rawText.value);
    } else {
      alert("You must paste your section data into the textbox.");
    }
  }

  function parseDialog(txt) {
    var linesOfText = txt.split("\n");

    // remove possible newlines at start and end
    while (linesOfText.at(-1) === "" || linesOfText.at(0) === "") {
      if (linesOfText.at(-1) === "") {
        linesOfText.pop();
      } else if (linesOfText.at(-0) === "") {
        linesOfText.shift();
      }
    }

    // split each line up by \t
    // rows becomes an array of objects
    var rows = [];
    for (let i = 0; i < linesOfText.length; i++) {
      rows[i] = {
        sectionName: linesOfText[i].split("\t")[0],
        sectionSISId: linesOfText[i].split("\t")[1],
        studentId: linesOfText[i].split("\t")[2],
      };

      // abort if row contains a studentId but no sectionSISId
      if (!rows[i]["sectionSISId"] && rows[i]["studentId"]) {
        alert(
          `Student cannot be imported to a section without a SIS ID. (check row ${
            i + 1
          })`
        );
        return;
      }

      // abort if row contains no sectionName or sectionSISId
      if (!rows[i]["sectionName"]) {
        alert(`Row does not contain section name. (check row ${i + 1})`);
        return;
      }
    }

    // Dialog checked and ready for import. Close dialog box and create loading spinner.
    $("#mw_sections_dialog").dialog("close");
    createLoadingSpinner();

    // Create arrays of unique sections for posting and unique students for posting
    const uniqueSections = removeDuplicateSections(rows);
    console.log("uniqueSections", uniqueSections);
    const uniqueStudents = removeDuplicateStudents(rows);
    console.log("uniqueStudents", uniqueStudents);

    // Remove students from uniqueStudents who aren't already enrolled in Canvas - to avoid enrolling them inadvertently
    getStudentsInCourse().then((students) => {
      const activeUsersInCourse = students;
      console.log("activeUsersInCourse", activeUsersInCourse);

      if (!activeUsersInCourse) {
        alert("Failed to get course enrolments.");
        return;
      }

      const separatedStudents = removeStudentsNotInCourse(
        activeUsersInCourse,
        uniqueStudents
      );
      const uniqueStudentsInCourse = separatedStudents[0];
      const uniqueStudentsNotInCourse = separatedStudents[1];
      console.log("uniqueStudentsInCourse", uniqueStudentsInCourse);
      console.log("uniqueStudentsNotInCourse", uniqueStudentsNotInCourse);

      if (
        confirm(`Number of unique sections: ${uniqueSections.length}
Number of unique students in course: ${uniqueStudentsInCourse.length}
Number of unique students not in course: ${uniqueStudentsNotInCourse.length}
Continue uploading sections?`)
      ) {
        processDialog(uniqueSections, uniqueStudentsInCourse);
        return;
      }

      deactivateLoadingSpinner();
      return;
    });
  }

  function removeStudentsNotInCourse(activeUsersInCourse, uniqueStudents) {
    const uniqueStudentsInCourse = $.grep(uniqueStudents, function (el) {
      return activeUsersInCourse.some(
        (user) => user["user"]["sis_user_id"] === el["studentId"]
      );
    });

    const uniqueStudentsNotInCourse = $.grep(uniqueStudents, function (el) {
      return !activeUsersInCourse.some(
        (user) => user["user"]["sis_user_id"] === el["studentId"]
      );
    });

    return [uniqueStudentsInCourse, uniqueStudentsNotInCourse];
  }

  async function getStudentsInCourse() {
    var enrolments = [];
    var parsedLinkHeader;

    var url = `${window.location.origin}/api/v1/courses/${courseId}/enrollments?state=active&per_page=100`;
    var settings = {
      //method: 'GET',
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    };
    console.log(`Fetching current course enrolments...`);
    var i = 1;
    while (url !== null) {
      const response = await fetch(url, settings);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      enrolments = [...enrolments, ...data];

      parsedLinkHeader = parseLinkHeader(response.headers.get("link"));

      if (parsedLinkHeader && parsedLinkHeader.next) {
        url = parsedLinkHeader.next;
      } else {
        url = null;
      }
      console.log(`Fetched from page ${i}. Enrolments: ${enrolments.length}.`);
      i++;
    }

    console.log("enrolments", enrolments);

    // Filter out test student users and inactive enrolments
    const activeEnrolments = $.grep(enrolments, function (el) {
      return el.user.sis_user_id && el.enrollment_state === "active";
    });

    return activeEnrolments;
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

  function processDialog(uniqueSections, uniqueStudentsInCourse) {
    // Post sections
    for (let i = 0; i < uniqueSections.length; i++) {
      var settings = {
        url: `${window.location.origin}/api/v1/courses/${courseId}/sections`,
        type: "POST",
        timeout: 0,
        async: false,
        data: {
          course_section: {
            name: uniqueSections[i]["sectionName"],
            sis_section_id: uniqueSections[i]["sectionSISId"],
          },
        },
        headers: {
          "X-CSRFToken": getCsrfToken(),
        },
      };
      postSection(settings);
    }

    // Post students to sections
    if (uniqueStudentsInCourse.length > 0) {
      for (let i = 0; i < uniqueStudentsInCourse.length; i++) {
        var settings = {
          url: `${window.location.origin}/api/v1/sections/sis_section_id:${uniqueStudentsInCourse[i]["sectionSISId"]}/enrollments`,
          type: "POST",
          timeout: 0,
          async: false,
          data: {
            enrollment: {
              user_id: `sis_user_id:${uniqueStudentsInCourse[i]["studentId"]}`,
              enrollment_state: "active",
              notify: false,
            },
          },
          headers: {
            "X-CSRFToken": getCsrfToken(),
          },
        };
        postStudent(settings);
      }
    }

    deactivateLoadingSpinner();
    alert("Import complete. Check console for any errors.");
  }

  function postStudent(settings) {
    $.ajax(settings).fail(function () {
      console.log(
        `Student "${settings["data"]["enrollment"]["user_id"]}" couldn't be imported.`
      );
    });
  }

  function postSection(settings) {
    $.ajax(settings).fail(function () {
      console.log(
        `Section "${settings["data"]["course_section"]["name"]}" couldn't be imported. Most likely the SIS ID is already in use.`
      );
    });
  }

  function removeDuplicateSections(input2dArray) {
    var flagArray = [];
    var outputArray = [];
    var j = -1;
    for (var i = 0, l = input2dArray.length; i < l; i++) {
      if (flagArray[input2dArray[i]["sectionSISId"]] !== true) {
        flagArray[input2dArray[i]["sectionSISId"]] = true;
        outputArray[++j] = {
          sectionName: input2dArray[i]["sectionName"],
          sectionSISId: input2dArray[i]["sectionSISId"],
        };
      } else if (
        !input2dArray[i]["sectionSISId"] ||
        input2dArray[i]["sectionSISId"].length === 0
      ) {
        outputArray[++j] = {
          sectionName: input2dArray[i]["sectionName"],
          sectionSISId: undefined,
        };
      }
    }

    return outputArray;
  }

  function removeDuplicateStudents(input2dArray) {
    var flagArray = [];
    var outputArray = [];
    var j = -1;
    for (var i = 0, l = input2dArray.length; i < l; i++) {
      if (
        flagArray[input2dArray[i]["studentId"]] !== true &&
        input2dArray[i]["studentId"]
      ) {
        flagArray[input2dArray[i]["studentId"]] = true;
        outputArray[++j] = {
          sectionSISId: input2dArray[i]["sectionSISId"],
          studentId: input2dArray[i]["studentId"],
        };
      }
    }

    return outputArray;
  }

  function closeDialog() {
    $(this).dialog("close");
    var el = document.getElementById("mw_section_text");
    if (el) {
      el.value = "";
    }
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
})();
