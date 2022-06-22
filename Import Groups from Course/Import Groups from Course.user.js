// ==UserScript==
// @name         Import Groups from Course
// @namespace    mw784
// @version      1
// @description  Import group shells from another Canvas course.
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/courses/*/users
// @include      https://newcastle.test.instructure.com/courses/*/users
// @include      https://newcastle.beta.instructure.com/courses/*/users
// ==/UserScript==

(function () {
  "use strict";

  const uniqueLinkId = "mw_groups_import";

  if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", () => addButton("Import..."));
  } else {
    addButton("Import...");
  }

  function addButton(linkText) {
    if (!document.getElementById(uniqueLinkId)) {
      const insBefore = document.querySelector(
        "#group_categories_tabs > div.pull-right.group-categories-actions > a"
      );
      if (!insBefore) return;

      const anchor = document.createElement("a");
      anchor.id = uniqueLinkId;
      anchor.classList.add("btn");
      anchor.style.marginRight = "4px";
      anchor.addEventListener("click", openDialog);
      const icon = document.createElement("i");
      icon.classList.add("icon-import");
      anchor.appendChild(icon);
      anchor.appendChild(document.createTextNode(` ${linkText}`));
      insBefore.parentNode.insertBefore(anchor, insBefore);
    }
    return;
  }

  function createDialog() {
    var el = document.querySelector("#mw_groups_dialog");
    if (!el) {
      el = document.createElement("div");
      el.id = "mw_groups_dialog";
      el.classList.add("ic-Form-control");
      var label = document.createElement("label");
      label.htmlFor = "mw_groups_text";
      label.textContent = "Course Details";
      label.classList.add("ic-Label");
      el.appendChild(label);
      var textarea = document.createElement("textarea");
      textarea.setAttribute("rows", "1");
      textarea.id = "mw_groups_text";
      textarea.classList.add("ic-Input");
      textarea.placeholder = `Enter SIS ID (CRS number) of source course here.`;
      el.appendChild(textarea);
      var msg = document.createElement("div");
      msg.id = "mw_groups_msg";
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

      $("#mw_groups_dialog").dialog({
        title: "Import Groups from Course",
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
        width: "40%",
      });
      if (!$("#mw_groups_dialog").dialog("isOpen")) {
        $("#mw_groups_dialog").dialog("open");
      }
    } catch (e) {
      console.log(e);
    }
  }

  function doNothing() {
    return;
  }

  function checkDialog() {
    var courseSISID = document.getElementById("mw_groups_text");
    courseSISID = courseSISID.value.trim();
    //var courseSISID = 'SBX.2021.MW784';

    if (courseSISID === "") {
      alert("Enter SIS ID into text field.");
      return;
    }

    var settings = {
      url: `${window.location.origin}/api/v1/courses/sis_course_id:${courseSISID}`,
      type: "GET",
      timeout: 0,
      async: false,
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    };

    var resp = $.parseJSON($.ajax(settings).responseText);

    if (!resp.id) {
      alert("Could not find course.");
      return;
    } else {
      var courseIdFlag = checkCourseId();
      if (!courseIdFlag) {
        alert("Unable to determine where to import sections.");
        return;
      }
      if (Number(courseId) === resp.id) {
        alert("Cannot import groups into same course.");
        return;
      }
    }

    processDialog(courseSISID);
  }

  function getGroupCategories(courseSISID) {
    var settings = {
      url: `${window.location.origin}/api/v1/courses/sis_course_id:${courseSISID}/group_categories`,
      type: "GET",
      timeout: 0,
      async: false,
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    };

    var resp = $.parseJSON($.ajax(settings).responseText);

    if (resp.length === 0) {
      alert("No groups found.");
      return;
    }

    const groupCats = [];
    for (let i = 0; i < resp.length; i++) {
      if (resp[i].self_signup === null) resp[i].self_signup = "";
      if (resp[i].auto_leader === null) resp[i].auto_leader = "";
      if (resp[i].group_limit === null) resp[i].group_limit = "";
      groupCats[i] = {
        id: resp[i].id,
        name: resp[i].name,
        selfSignUp: resp[i].self_signup,
        autoLeader: resp[i].auto_leader,
        groupLimit: resp[i].group_limit,
      };
    }

    return groupCats;
  }

  function getGroups(courseSISID) {
    var settings = {
      url: `${window.location.origin}/api/v1/courses/sis_course_id:${courseSISID}/groups`,
      type: "GET",
      timeout: 0,
      async: false,
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    };

    var resp = $.parseJSON($.ajax(settings).responseText);

    const groups = [];
    for (let i = 0; i < resp.length; i++) {
      if (resp[i].description === null) resp[i].description = "";
      groups[i] = {
        groupCatId: resp[i].group_category_id,
        name: resp[i].name,
        description: resp[i].description,
      };
    }

    return groups;
  }

  function postGroupCategories(groupCats) {
    const newGroupCats = [];

    for (let i = 0; i < groupCats.length; i++) {
      var settings = {
        url: `${window.location.origin}/api/v1/courses/${courseId}/group_categories`,
        type: "POST",
        timeout: 0,
        async: false,
        data: {
          course_id: groupCats[i]["id"],
          name: groupCats[i]["name"],
          self_signup: groupCats[i]["selfSignUp"],
          auto_leader: groupCats[i]["autoLeader"],
          group_limit: groupCats[i]["groupLimit"],
        },
        headers: {
          "X-CSRFToken": getCsrfToken(),
        },
      };

      var resp = $.parseJSON($.ajax(settings).responseText);

      newGroupCats[i] = {
        id: resp.id,
        name: resp.name,
      };
    }

    return newGroupCats;
  }

  function updateGroupCatIds(groups, oldGroupCats, newGroupCats) {
    const groupCatIdMappings = [];
    for (let i = 0; i < oldGroupCats.length; i++) {
      groupCatIdMappings[i] = {
        oldGroupCatId: oldGroupCats[i]["id"],
        newGroupCatId: newGroupCats[i]["id"],
      };
    }

    for (let i = 0; i < groups.length; i++) {
      for (let k = 0; k < groupCatIdMappings.length; k++) {
        if (
          groups[i]["groupCatId"] === groupCatIdMappings[k]["oldGroupCatId"]
        ) {
          groups[i]["groupCatId"] = groupCatIdMappings[k]["newGroupCatId"];
          break;
        }
      }
    }
    return groups;
  }

  function postGroups(groups) {
    console.log("reached postgroups");

    for (let i = 0; i < groups.length; i++) {
      var settings = {
        url: `${window.location.origin}/api/v1/group_categories/${groups[i]["groupCatId"]}/groups`,
        type: "POST",
        timeout: 0,
        async: false,
        data: {
          group_category_id: groups[i]["groupCatId"],
          name: groups[i]["name"],
          description: groups[i]["description"],
        },
        headers: {
          "X-CSRFToken": getCsrfToken(),
        },
      };

      $.ajax(settings);
    }
  }

  function checkCourseId() {
    const courseId = getCourseId();
    if (!Number(courseId)) {
      alert("Unable to determine where to import sections.");
      return false;
    } else {
      return true;
    }
  }

  function processDialog(courseSISID) {
    const groupCats = getGroupCategories(courseSISID);
    const groups = getGroups(courseSISID);
    const newGroupCats = postGroupCategories(groupCats);
    const newGroups = updateGroupCatIds(groups, groupCats, newGroupCats);
    postGroups(newGroups);

    window.location.reload(true);
  }

  function closeDialog() {
    $(this).dialog("close");
    var el = document.getElementById("mw_groups_text");
    if (el) {
      el.value = "";
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
      id = Number(matches[1]);
    }
    return id;
  }
})();
