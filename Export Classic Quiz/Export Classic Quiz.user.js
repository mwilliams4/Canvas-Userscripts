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
    'use strict';

    const courseId = getCourseId();

    const quizId = getQuizId();
    const uniqueLinkId = 'mw_section_upload';
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';

    function addExportButton(buttonText, buttonIcon) {
        if (!document.getElementById(uniqueLinkId)) {
            const insBefore = document.querySelector('#toolbar-1 > li:nth-child(8)');
            if (insBefore) {
                const listItem = document.createElement('li');
                listItem.setAttribute('role', 'presentation');
                listItem.classList.add('ui-menu-item');
                listItem.style.setProperty('cursor', 'pointer');
                const anchor = document.createElement('a');
                anchor.classList.add('ui-corner-all');
                anchor.setAttribute('tabindex', '-1');
                anchor.setAttribute('role', 'menuitem');
                anchor.id = uniqueLinkId;
                anchor.addEventListener('click', () => {
                    processRequest();
                });
                const icon = document.createElement('i');
                icon.classList.add(buttonIcon);
                icon.setAttribute('aria-hidden', 'true');
                anchor.appendChild(icon);
                anchor.appendChild(document.createTextNode(` ${buttonText}`));
                listItem.appendChild(anchor)
                insBefore.parentNode.insertBefore(listItem, insBefore);
            }
        }
        return;
    }

    async function processRequest() {
        if (!checkIds()) {
            alert('Couldn\'t identify course and/or quiz.')
            return;
        }

        const questions = await getQuestions();
        const innerHTML = await processQuestions(questions);
        const quizName = await getQuizName();
        if (innerHTML) Export2Word(innerHTML, quizName)
    }

    async function updateImageURL(image) {
        var dataApiEndpoint, settings, response, responseJSON, url, uuid;
        dataApiEndpoint = image.getAttribute('data-api-endpoint');

        settings = {
            headers: {
                "X-CSRFToken": getCsrfToken()
            },
        }
        response = await fetch(dataApiEndpoint, settings);
        responseJSON = await response.json();
        ({ url, uuid } = responseJSON)

        image.setAttribute('src', `${url}&verifier=${uuid}`)
        return image;
    }

    async function findLatestSubmission() {
        var settings, response, responseJSON, url, submissionData;
        var submissions = [];
        url = `${window.location.origin}/api/v1/courses/${courseId}/quizzes/${quizId}/submissions`;
        settings = {
            headers: {
                "X-CSRFToken": getCsrfToken()
            },
        }

        response = await fetch(url, settings);
        responseJSON = await response.json();

        responseJSON.quiz_submissions.forEach(submission => {
            submissionData = {
                time: Date.parse(submission.started_at).getTime(),
                submissionId: submission.id,
            }
            submissions = [...submissions, submissionData]
        })

        const latestSubmission = submissions.reduce(function (prev, current) {
            return (prev.time > current.time) ? prev : current
        })

        return latestSubmission;
    }

    async function orderQuestions(questions) {
        var settings, response, responseJSON, url, match;

        console.log('Reordering questions.');

        const latestSubmission = await findLatestSubmission();

        url = `${window.location.origin}/api/v1/quiz_submissions/${latestSubmission.submissionId}/questions`;
        settings = {
            headers: {
                "X-CSRFToken": getCsrfToken()
            },
        }

        response = await fetch(url, settings);
        responseJSON = await response.json();
        const submissionQuestions = responseJSON.quiz_submission_questions

        questions.forEach(question => {
            match = submissionQuestions.find(q => { return q.id === question.id });
            question.position = match ? match.position : null;
        })

        const orderedQuestions = questions.sort((a, b) => (a.position != null ? a.position : Infinity) - (b.position != null ? b.position : Infinity))

        return orderedQuestions;
    }

    async function updateGraphics(question) {
        var questionEl, answerEl, newImage, images, span;

        questionEl = document.createElement('body');
        questionEl.innerHTML = question.question_text;

        // Update image URLS
        images = questionEl.querySelectorAll('img[data-api-endpoint]');
        if (images.length > 0) {
            // console.log('This question text has regular images.');
            for (let i = 0; i < images.length; i++) {
                newImage = await updateImageURL(images[i]);
                images[i].replaceWith(newImage)
            }
        }

        // Update SVG image elements
        images = questionEl.querySelectorAll('.equation_image');
        if (images.length > 0) {
            // console.log('This question text has SVG images.')
            for (let i = 0; i < images.length; i++) {
                span = images[i].parentNode.querySelector('span');
                if (span) span.remove();
                images[i].setAttribute('src', `${images[i].src}.svg`);
            }
        }

        question.question_text = questionEl.innerHTML;

        if (question.answers.length > 0) {
            // console.log(`This question contains answers.`);
            for (let i = 0; i < question.answers.length; i++) {
                answerEl = document.createElement('body');
                answerEl.innerHTML = question.answers[i].html;

                // Update image URLS
                images = answerEl.querySelectorAll('img[data-api-endpoint]')
                if (images.length > 0) {
                    // console.log('This answer has regular images.');
                    for (let k = 0; k < images.length; k++) {
                        newImage = await updateImageURL(images[k]);
                        images[k].replaceWith(newImage)
                    }
                    question.answers[i].html = answerEl.innerHTML;
                }

                // Update SVG image elements
                images = answerEl.querySelectorAll('.equation_image');
                if (images.length > 0) {
                    // console.log('This answer has SVG images.');
                    for (let i = 0; i < images.length; i++) {
                        span = images[i].parentNode.querySelector('span');
                        if (span) span.remove();
                        images[i].setAttribute('src', `${images[i].src}.svg`);
                    }
                    question.answers[i].html = answerEl.innerHTML;
                }
            }
        }

        return question;
    }

    async function processQuestions(questions) {
        var innerHTML = '';
        var innerHTML1 = '';
        var question, answers, text, type, html, weight;
        var blankIds = [];

        if (questions.length === 0) {
            alert('No questions found');
            return;
        }

        const columns = ["quiz_id", "id", "quiz_group_id", "position", "question_type", "question_text"];
        console.table(questions, columns);

        // Canvas' Quiz Questions API includes a 'position' parameter but it always returns null (it is broken). Therefore, ordering of questions must be done based on a quiz submission. The function orderQuestions identifies the most recent submission and reorders questions (if necessary) to reflect this order.
        questions = await orderQuestions(questions)

        console.table(questions);
        // debugger;

        for (let i = 0; i < questions.length; i++) {
            console.log(`===================== NOW RUNNING QUESTION ${i + 1} =====================`);
            question = questions[i];
            question = await updateGraphics(question);
            ({ question_text: text, question_type: type, answers, } = question)

            // Multiple choice questions
            switch (type) {
                case 'multiple_choice_question': {
                    // Question text
                    innerHTML += `${text.slice(0, 3)}${i + 1}. ${text.slice(3)}`;
                    // Answers
                    for (let k = 0; k < answers.length; k++) {
                        ({ html, text, weight, } = answers[k]);

                        switch (html) {
                            case '':
                                if (weight !== 0) innerHTML += `<p>*${alphabet[k]}. ${text}</p>`; // Correct answer
                                else innerHTML += `<p>${alphabet[k]}. ${text}</p>`; // Incorrect answer
                                break;
                            default:
                                if (weight !== 0) innerHTML += `${html.slice(0, 3)}*${alphabet[k]}. ${html.slice(3)}`; // Correct answer
                                else innerHTML += `${html.slice(0, 3)}${alphabet[k]}. ${html.slice(3)}`; // Incorrect answer
                                break;
                        }
                    }
                    break;
                }
                case 'essay_question': {
                    innerHTML += `${text.slice(0, 3)}${i + 1}. ${text.slice(3)}`;
                    break;
                }
                case 'file_upload_question': {
                    innerHTML += `${text.slice(0, 3)}${i + 1}. ${text.slice(3)}`;
                    break;
                }
                case 'true_false_question': {
                    innerHTML += `${text.slice(0, 3)}${i + 1}. ${text.slice(3)}`;
                    for (let k = 0; k < answers.length; k++) {
                        if (answers[k].weight !== 0) innerHTML += `<p>*${alphabet[k]}. ${answers[k].text}</p>`; // Correct answer
                        else innerHTML += `<p>${alphabet[k]}. ${answers[k].text}</p>`; // Incorrect answer
                    }
                    break;
                }
                case 'multiple_answers_question': {
                    innerHTML += `${text.slice(0, 3)}${i + 1}. ${text.slice(3)}`;
                    for (let k = 0; k < answers.length; k++) {
                        ({ html, text, weight, } = answers[k]);
                        switch (html) {
                            case undefined:
                                if (weight !== 0) innerHTML += `<p>*${alphabet[k]}. ${text}</p>`; // Correct answer
                                else innerHTML += `<p>${alphabet[k]}. ${text}</p>`; // Incorrect answer
                                break;
                            default:
                                if (weight !== 0) innerHTML += `${html.slice(0, 3)}*${alphabet[k]}. ${html.slice(3)}`; // Correct answer
                                else innerHTML += `${html.slice(0, 3)}${alphabet[k]}. ${html.slice(3)}`; // Incorrect answer
                                break;
                        }
                    }
                    break;
                }
                case 'short_answer_question': { // Fill in the blank
                    innerHTML += `<p>Type: F</p>${text.slice(0, 3)}${i + 1}. ${text.slice(3)}`;
                    for (let k = 0; k < answers.length; k++) {
                        ({ text } = answers[k]);
                        innerHTML += `<p>${alphabet[k]}. ${text}</p>`;
                    }
                    break;
                }
                case 'fill_in_multiple_blanks_question': {
                    innerHTML += `<p>Type: FMB</p>${text.slice(0, 3)}${i + 1}. ${text.slice(3)}`;
                    //debugger;
                    answers.forEach(answer => {
                        if (blankIds.indexOf(answer.blank_id) === -1) blankIds.push(answer.blank_id) // Creating array of unique blank ids
                    })
                    blankIds.forEach(blankId => {
                        innerHTML += `<p>${blankId}:`;
                        answers.forEach(answer => {
                            if (answer.blank_id === blankId) innerHTML += ` ${answer.text},`;
                        })
                        innerHTML = `${innerHTML.slice(0, -1)}</p>`;
                    })
                    break;
                }
                default: {
                    debugger;
                    //alert('Non supported question type found. Aborting.');
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
                "X-CSRFToken": getCsrfToken()
            },
        }

        while (url !== null) {
            const response = await fetch(url, settings)

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            questions = [...questions, ...data];

            parsedLinkHeader = parseLinkHeader(response.headers.get('link'));

            if (parsedLinkHeader && parsedLinkHeader.next) {
                url = parsedLinkHeader.next;
            }
            else {
                url = null;
            }
            console.log(`Fetched from page ${i}. Questions: ${questions.length}.`);
            i++;
        }
        return questions;
    }

    function Export2Word(innerHTML = '<p>This is a test!</p>', filename = 'quiz_export') {
        var preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        var postHtml = "</body></html>";

        var html = preHtml + innerHTML + postHtml;
        var blob = new Blob(['\ufeff', html], {
            type: 'application/msword'
        });

        // Specify link url
        var url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
        // Specify file name
        filename = filename ? filename + '.doc' : 'document.doc';
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
                "X-CSRFToken": getCsrfToken()
            },
        };

        const response = await fetch(url, settings);
        const responseJSON = await response.json();

        return responseJSON.title;

    }

    function getCsrfToken() {
        var csrfRegex = new RegExp('^_csrf_token=(.*)$');
        var csrf;
        var cookies = document.cookie.split(';');
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
        const courseRegex = new RegExp('^/courses/([0-9]+)');
        const matches = courseRegex.exec(window.location.pathname);
        if (matches) {
            id = matches[1];
        }
        return id;
    }

    function getQuizId() {
        let id = false;
        const quizRegex = new RegExp('^/courses/([0-9]+)/quizzes/([0-9]+)');
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
        var parts = header.split(',');
        var links = {};
        // Parse each part into a named link
        _.each(parts, function (p) {
            var section = p.split(';');
            if (section.length != 2) {
                throw new Error("section could not be split on ';'");
            }
            var url = section[0].replace(/<(.*)>/, '$1').trim();
            var name = section[1].replace(/rel="(.*)"/, '$1').trim();
            links[name] = url;
        });

        return links;
    }

    function checkIds() {
        if (Number(courseId) && Number(quizId)) {
            return true;
        }
        else {
            return false;
        }
    }

    function addE2WButton() {
        if (!document.getElementById('e2wButton')) {
            const insBefore = document.querySelector('#toolbar-1 > li:nth-child(8)');
            if (insBefore) {
                const listItem = document.createElement('li');
                listItem.setAttribute('role', 'presentation');
                listItem.classList.add('ui-menu-item');
                listItem.style.setProperty('cursor', 'pointer');
                const anchor = document.createElement('a');
                anchor.classList.add('ui-corner-all');
                anchor.setAttribute('tabindex', '-1');
                anchor.setAttribute('role', 'menuitem');
                anchor.id = 'e2wButton';
                anchor.addEventListener('click', () => {
                    Export2Word();
                });
                const icon = document.createElement('i');
                icon.classList.add('icon-download');
                icon.setAttribute('aria-hidden', 'true');
                anchor.appendChild(icon);
                anchor.appendChild(document.createTextNode(` E2W`));
                listItem.appendChild(anchor)
                insBefore.parentNode.insertBefore(listItem, insBefore);
            }
        }
        return;
    }

    if (document.readyState !== 'loading') {
        addExportButton('Export Quiz', 'icon-download');
        addE2WButton();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            addExportButton('Export Quiz', 'icon-download');
        });
    }

})();




