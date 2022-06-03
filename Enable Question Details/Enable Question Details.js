// ==UserScript==
// @name         Enable Question Details
// @namespace    mw784
// @version      1
// @license      MIT
// @description  A simple script to allow question details to be shown in classic quizzes with more than 25 questions.
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/courses/*/quizzes/*/edit
// @include      https://newcastle.test.instructure.com/courses/*/quizzes/*/edit
// @include      https://newcastle.beta.instructure.com/courses/*/quizzes/*/edit
// ==/UserScript==

(function () {
  "use strict";

  if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", enableQuestionDetails);
  } else {
    enableQuestionDetails();
  }

  function enableQuestionDetails() {
    const inputCheckbox = document.querySelector("#show_question_details");
    if (inputCheckbox) {
      inputCheckbox.removeAttribute("disabled");
    }

    const span = document.querySelector("#question-detail-disabled");
    if (span) {
      span.remove();
    }
  }
})();
