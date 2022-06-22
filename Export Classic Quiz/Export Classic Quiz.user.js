// ==UserScript==
// @name         Export Classic Quiz
// @namespace    mw784
// @version      1
// @license      MIT
// @description  Export a classic quiz to a Word document from Canvas
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/courses/*/quizzes/*
// @include      https://newcastle.test.instructure.com/courses/*/quizzes/*
// @include      https://newcastle.beta.instructure.com/courses/*/quizzes/*
// ==/UserScript==

(function () {
  "use strict";

  const courseId = getCourseId();

  const quizId = getQuizId();
  const uniqueLinkId = "mw_export_classic_quiz";
  const alphabet = "abcdefghijklmnopqrstuvwxyz";

  if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      addExportButton("Export Quiz", "icon-download")
    );
  } else {
    addExportButton("Export Quiz", "icon-download");
  }

  function addExportButton(buttonText, buttonIcon) {
    var parent;
    if (document.getElementById(uniqueLinkId)) return;
    switch (window.location.href) {
      case `${window.location.origin}/courses/${courseId}/quizzes/${quizId}`:
      case `${window.location.origin}/courses/${courseId}/quizzes/${quizId}/`: {
        parent = document.querySelector("#toolbar-1");
        if (!parent) return;
        break;
      }
      case `${window.location.origin}/courses/${courseId}/quizzes/${quizId}/edit`:
      case `${window.location.origin}/courses/${courseId}/quizzes/${quizId}/edit/`: {
        parent = document.querySelector("#manage-toolbar");
        if (!parent) return;
        break;
      }
      default:
        return;
    }
    const listItem = document.createElement("li");
    listItem.setAttribute("role", "presentation");
    listItem.classList.add("ui-menu-item");
    listItem.style.setProperty("cursor", "pointer");
    const anchor = document.createElement("a");
    anchor.classList.add("ui-corner-all");
    anchor.setAttribute("tabindex", "-1");
    anchor.setAttribute("role", "menuitem");
    anchor.id = uniqueLinkId;
    anchor.addEventListener("click", () => {
      processRequest();
    });
    const icon = document.createElement("i");
    icon.classList.add(buttonIcon);
    icon.setAttribute("aria-hidden", "true");
    anchor.appendChild(icon);
    anchor.appendChild(document.createTextNode(` ${buttonText}`));
    listItem.appendChild(anchor);
    // insBefore.parentNode.insertBefore(listItem, insBefore);
    parent.appendChild(listItem);
    return;
  }

  async function processRequest() {
    if (!checkIds()) {
      alert("Couldn't identify course and/or quiz.");
      return;
    }

    const questions = await getQuestions();
    const innerHTML = await processQuestions(questions);
    const quizName = await getQuizName();
    if (innerHTML) Export2Word(innerHTML, quizName);
  }

  function isHTML(string) {
    const el = document.createElement("div");
    el.innerHTML = string;
    if (el.childNodes.length > 0 && el.childNodes[0].tagName === "P")
      return true;
    return false;
  }

  function addNumber(string, i) {
    const el = document.createElement("body");
    if (isHTML(string)) {
      el.innerHTML = string;
      el.childNodes[0].innerHTML = `${i + 1}. ${el.childNodes[0].innerHTML}`;
    } else {
      const p = document.createElement("p");
      p.innerHTML = `${i + 1}. ${string}`;
      el.appendChild(p);
    }
    return el.innerHTML;
  }

  function addLetter(string, k, correct = false) {
    const el = document.createElement("body");
    if (isHTML(string)) {
      el.innerHTML = string;
      el.childNodes[0].innerHTML = correct
        ? `*${alphabet[k]}. ${el.childNodes[0].innerHTML}`
        : `${alphabet[k]}. ${el.childNodes[0].innerHTML}`;
    } else {
      const p = document.createElement("p");
      p.innerHTML = correct
        ? `*${alphabet[k]}. ${string}`
        : `${alphabet[k]}. ${string}`;
      el.appendChild(p);
    }
    return el.innerHTML;
  }

  async function updateImageURL(image) {
    var dataApiEndpoint, settings, response, responseJSON, url, uuid;
    dataApiEndpoint = image.getAttribute("data-api-endpoint");

    settings = {
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    };
    response = await fetch(dataApiEndpoint, settings);
    responseJSON = await response.json();
    ({ url, uuid } = responseJSON);

    image.setAttribute("src", `${url}&verifier=${uuid}`);
    return image;
  }

  async function updateGraphics(question) {
    var questionEl,
      answerEl,
      newImage,
      images,
      span,
      paragraphs,
      re,
      match,
      height,
      width,
      text,
      html;
    const svgHeight = 23;

    questionEl = document.createElement("body");
    questionEl.innerHTML = question.question_text;

    // Update image URLS
    images = questionEl.querySelectorAll("img[data-api-endpoint]");
    if (images.length > 0) {
      // console.log('This question text has regular images.');
      for (let i = 0; i < images.length; i++) {
        newImage = await updateImageURL(images[i]);
        images[i].replaceWith(newImage);
      }
    }

    // Update SVG image elements
    images = questionEl.querySelectorAll(".equation_image");
    if (images.length > 0) {
      // console.log('This question text has SVG images.')
      for (let i = 0; i < images.length; i++) {
        span = images[i].parentNode.querySelector("span");
        if (span) span.remove();
        images[i].setAttribute("src", `${images[i].src}.svg`);
        height = Number(images[i].getAttribute("height"));
        width = Number(images[i].getAttribute("width"));
        width = svgHeight / (height / width);
        images[i].setAttribute("height", svgHeight.toString());
        images[i].setAttribute("width", width.toString());
      }
    }

    // Convert inline LaTeX to images
    paragraphs = questionEl.querySelectorAll("p");
    if (paragraphs.length > 0) {
      // console.log('This question text has SVG images.')
      for (let i = 0; i < paragraphs.length; i++) {
        re = /\\\((.+)\\\)/;
        match = re.exec(paragraphs[i].innerHTML);
        if (match) {
          newImage = document.createElement("img");
          newImage.setAttribute(
            "src",
            `${window.location.origin}/equation_images/${encodeURIComponent(
              match[1]
            )}?scale=1.svg`
          );
          paragraphs[i].innerHTML = paragraphs[i].innerHTML.replace(
            match[0],
            newImage.outerHTML
          );
          match.length = 0;
        }
      }
    }

    question.question_text = questionEl.innerHTML;

    if (question.answers.length > 0) {
      // console.log(`This question contains answers.`);
      for (let k = 0; k < question.answers.length; k++) {
        ({ html, text } = question.answers[k]);
        answerEl = document.createElement("body");
        if (!html) html = text;
        answerEl.innerHTML = html;

        // Update image URLS
        images = answerEl.querySelectorAll("img[data-api-endpoint]");
        if (images.length > 0) {
          // console.log('This answer has regular images.');
          for (let i = 0; i < images.length; i++) {
            newImage = await updateImageURL(images[i]);
            images[i].replaceWith(newImage);
          }
          question.answers[k].html = answerEl.innerHTML;
        }

        // Update SVG image elements
        images = answerEl.querySelectorAll(".equation_image");
        if (images.length > 0) {
          // console.log('This answer has SVG images.');
          for (let i = 0; i < images.length; i++) {
            span = images[i].parentNode.querySelector("span");
            if (span) span.remove();
            images[i].setAttribute("src", `${images[i].src}.svg`);
            height = Number(images[i].getAttribute("height"));
            width = Number(images[i].getAttribute("width"));
            width = svgHeight / (height / width);
            images[i].setAttribute("height", svgHeight.toString());
            images[i].setAttribute("width", width.toString());
          }
          question.answers[k].html = answerEl.innerHTML;
        }
        // Convert inline LaTeX to images

        re = /\\\((.+)\\\)/;
        match = re.exec(answerEl.innerHTML);
        if (match) {
          newImage = document.createElement("img");
          newImage.setAttribute(
            "src",
            `${window.location.origin}/equation_images/${encodeURIComponent(
              match[1]
            )}?scale=1.svg`
          );
          answerEl.innerHTML = answerEl.innerHTML.replace(
            match[0],
            newImage.outerHTML
          );
          match.length = 0;
          question.answers[k].html = answerEl.innerHTML;
        }
      }
    }

    return question;
  }

  async function getQuestionOrderIds() {
    var questionNodes, questionNodesArray;

    const responseText = await $.ajax({
      url: `${window.location.origin}/courses/${courseId}/quizzes/${quizId}/edit`,
      success: function (data) {
        return data;
      },
    });

    const doc = document.createElement("div");
    doc.innerHTML = responseText;

    questionNodes = doc.querySelectorAll(
      "div.question_text.user_content[id]:not(#question_new_question_text)"
    );
    if (questionNodes.length === 0)
      questionNodes = doc.querySelectorAll(
        "div.display_question.question[id]:not(#question_new_question_text)"
      );

    questionNodesArray = Array.from(questionNodes);
    questionNodesArray = questionNodesArray.filter((questionNode) => {
      return /\d/.test(questionNode.id);
    });

    const questionOrderIds = questionNodesArray.map((node) =>
      Number(node.id.split("_")[1])
    );
    return questionOrderIds;
  }

  async function orderQuestions(questions) {
    const questionOrderIds = await getQuestionOrderIds();
    debugger;
    if (questions.length !== questionOrderIds.length) {
      return false;
    }
    const orderedQuestions = questions.sort(
      (a, b) => questionOrderIds.indexOf(a.id) - questionOrderIds.indexOf(b.id)
    );
    return orderedQuestions;
  }

  async function processQuestions(questions) {
    var innerHTML = "";
    var question,
      answers,
      text,
      type,
      html,
      weight,
      left,
      right,
      distractors,
      answerType,
      start,
      end,
      approximate,
      precision,
      exact,
      margin,
      variables,
      answer_tolerance,
      formulas,
      name,
      min,
      max,
      decimals;
    var blankIds = [];
    var matches = [];

    if (questions.length === 0) {
      alert("No questions found. Questions in banks need to be done manually.");
      return;
    }

    const columns = ["id", "quiz_group_id", "question_text"];
    console.log("Unordered questions:");
    console.table(questions, columns);

    //questions = await orderQuestions(questions)
    questions = await orderQuestions(questions);
    if (!questions) {
      alert(
        "Number of questions retrieved by API does not match number of questions scraped from quiz. Aborting."
      );
      return;
    }

    console.log("Ordered questions:");
    console.table(questions, columns);

    for (let i = 0; i < questions.length; i++) {
      question = questions[i];
      question = await updateGraphics(question);
      ({ question_text: text, question_type: type, answers } = question);
      //if (!isHTML(text)) text = `<p>${text}</p>`;
      blankIds.length = 0;

      if (i !== 0) innerHTML += "<br>";

      // Multiple choice questions
      switch (type) {
        case "multiple_choice_question": {
          innerHTML += addNumber(text, i);
          for (let k = 0; k < answers.length; k++) {
            ({ html, text, weight } = answers[k]);
            if (html) text = html;
            if (weight !== 0)
              innerHTML += addLetter(text, k, true); // Correct answer
            else innerHTML += addLetter(text, k); // Incorrect answer
          }
          break;
        }
        case "essay_question": {
          innerHTML += `<p>Type: E</p>${addNumber(text, i)}`;
          break;
        }
        case "file_upload_question": {
          innerHTML += `<p>Type: File Upload</p>${addNumber(text, i)}`;
          break;
        }
        case "true_false_question": {
          innerHTML += `<p>Type: T/F</p>${addNumber(text, i)}`;
          for (let k = 0; k < answers.length; k++) {
            ({ html, text, weight } = answers[k]);
            if (answers[k].weight !== 0)
              innerHTML += addLetter(text, k, true); // Correct answer
            else innerHTML += addLetter(text, k); // Incorrect answer
          }
          break;
        }
        case "multiple_answers_question": {
          innerHTML += `<p>Type: MA</p>${addNumber(text, i)}`;
          for (let k = 0; k < answers.length; k++) {
            ({ html, text, weight } = answers[k]);
            if (html) text = html;
            if (weight !== 0)
              innerHTML += addLetter(text, k, true); // Correct answer
            else innerHTML += addLetter(text, k); // Incorrect answer
          }
          break;
        }
        case "short_answer_question": {
          // Fill in the blank
          innerHTML += `<p>Type: F</p>${addNumber(text, i)}`;
          for (let k = 0; k < answers.length; k++) {
            ({ text } = answers[k]);
            innerHTML += addLetter(text, k);
          }
          break;
        }
        case "fill_in_multiple_blanks_question": {
          answers.forEach((answer) => {
            if (blankIds.indexOf(answer.blank_id) === -1)
              blankIds.push(answer.blank_id); // Creating array of unique blank ids
          });
          for (let k = 0; k < blankIds.length; k++) {
            matches.length = 0;
            for (let j = 0; j < answers.length; j++) {
              if (answers[j].blank_id === blankIds[k])
                matches.push(answers[j].text);
            }
            text = text.replace(`[${blankIds[k]}]`, `[${matches.join(", ")}]`);
          }
          innerHTML += `<p>Type: FMB</p>${addNumber(text, i)}`;
          break;
        }
        case "multiple_dropdowns_question": {
          answers.forEach((answer) => {
            if (blankIds.indexOf(answer.blank_id) === -1)
              blankIds.push(answer.blank_id); // Creating array of unique blank ids
          });
          for (let k = 0; k < blankIds.length; k++) {
            matches.length = 0;
            for (let j = 0; j < answers.length; j++) {
              if (answers[j].blank_id === blankIds[k])
                matches.push(
                  answers[j].weight !== 0
                    ? `*${answers[j].text}`
                    : answers[j].text
                );
            }
            text = text.replace(`[${blankIds[k]}]`, `[${matches.join(", ")}]`);
          }
          innerHTML += `<p>Type: MD</p>${addNumber(text, i)}`;
          break;
        }
        case "text_only_question": {
          innerHTML += `<p>Type: Text</p>${addNumber(text, i)}`;
          break;
        }
        case "matching_question": {
          innerHTML += `<p>Type: MT</p>${addNumber(text, i)}`;
          ({ matching_answer_incorrect_matches: distractors } = question);
          for (let k = 0; k < answers.length; k++) {
            ({ left, right } = answers[k]);
            innerHTML += addLetter(`${left} = ${right}`, k);
          }
          if (distractors)
            innerHTML += `<p>Distractors: ${distractors
              .split("\n")
              .join(", ")}</p>`;
          break;
        }
        case "numerical_question": {
          innerHTML += `<p>Type: Numerical</p>${addNumber(text, i)}`;
          for (let k = 0; k < answers.length; k++) {
            ({
              numerical_answer_type: answerType,
              start,
              end,
              approximate,
              precision,
              exact,
              margin,
            } = answers[k]);
            switch (answerType) {
              case "range_answer": {
                innerHTML += addLetter(
                  `Answer in the range: between ${start} and ${end}.`,
                  k,
                  true
                );
                break;
              }
              case "precision_answer": {
                innerHTML += addLetter(
                  `Answer with precision: ${approximate} with precision ${precision}.`,
                  k,
                  true
                );
                break;
              }
              case "exact_answer": {
                innerHTML += addLetter(
                  `Exact answer: ${exact} with error margin ${margin}.`,
                  k,
                  true
                );
                break;
              }
            }
          }
          break;
        }
        case "calculated_question": {
          innerHTML += `<p>Type: Formula</p>${addNumber(text, i)}`;
          ({ variables, answer_tolerance, formulas } = question);
          for (let k = 0; k < variables.length; k++) {
            ({ name, min, max, scale: decimals } = variables[k]);
            innerHTML += `<p>[${name}]: min = ${min}, max = ${max}, decimals = ${decimals}</p>`;
          }
          innerHTML += `<p>Formula: ${
            formulas.at(-1).formula
          }</p><p>Answer tolerance: ${answer_tolerance}</p>`;
          break;
        }
        default: {
          debugger;
          alert("Non supported question type found. Aborting.");
          return false;
        }
      }
    }

    return innerHTML;
  }

  async function getQuestions() {
    var questions = [];
    var parsedLinkHeader;

    var url = `${window.location.origin}/api/v1/courses/${courseId}/quizzes/${quizId}/questions?per_page=100`;
    var settings = {
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    };

    var i = 1;
    while (url !== null) {
      const response = await fetch(url, settings);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      questions = [...questions, ...data];

      parsedLinkHeader = parseLinkHeader(response.headers.get("link"));

      if (parsedLinkHeader && parsedLinkHeader.next) {
        url = parsedLinkHeader.next;
      } else {
        url = null;
      }
      console.log(`Fetched from page ${i}. Questions: ${questions.length}.`);
      i++;
    }
    return questions;
  }

  function Export2Word(innerHTML, filename = "quiz_export") {
    var preHtml =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body style='font-family: Arial'>";
    var postHtml = "</body></html>";

    var html = `${preHtml}${innerHTML}${postHtml}`;
    var blob = new Blob(["\ufeff", html], {
      type: "application/msword",
    });

    // Specify link url
    var url =
      "data:application/vnd.ms-word;charset=utf-8," + encodeURIComponent(html);
    // Specify file name
    filename = filename ? filename + ".doc" : "document.doc";
    // Create download link element
    var downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);

    if (navigator.msSaveOrOpenBlob) {
      navigator.msSaveOrOpenBlob(blob, filename);
    } else {
      // Create a link to the file
      downloadLink.href = url;

      // Setting the file name
      downloadLink.download = filename;

      //triggering the function
      downloadLink.click();
    }
    document.body.removeChild(downloadLink);
  }

  async function getQuizName() {
    var url = `${window.location.origin}/api/v1/courses/${courseId}/quizzes/${quizId}`;
    var settings = {
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    };

    const response = await fetch(url, settings);
    const responseJSON = await response.json();

    return responseJSON.title;
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

  function getQuizId() {
    let id = false;
    const quizRegex = new RegExp("^/courses/([0-9]+)/quizzes/([0-9]+)");
    const matches = quizRegex.exec(window.location.pathname);
    if (matches) {
      id = matches[2];
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
    if (Number(courseId) && Number(quizId)) {
      return true;
    } else {
      return false;
    }
  }
})();
