// ==UserScript==
// @name         Remove Course Enrolments Scroll Bar
// @namespace    mw784
// @version      1
// @license      MIT
// @description  A simple script to remove the scroll bar from a users course enrolments in Canvas
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/accounts/*/users/*
// @include      https://newcastle.test.instructure.com/accounts/*/users/*
// @include      https://newcastle.beta.instructure.com/accounts/*/users/*
// ==/UserScript==

(function () {
  "use strict";

  if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", removeMaxHeight);
  } else {
    removeMaxHeight();
  }

  function removeMaxHeight() {
    const elementStyle = document.querySelector(
      "#courses_list > div > ul"
    ).style;
    elementStyle.removeProperty("max-height");
  }
})();
