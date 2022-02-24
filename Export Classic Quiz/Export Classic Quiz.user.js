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

    function processRequest() {
        if (!checkIds()) {
            alert('Couldn\'t identify course and/or quiz.')
            return;
        }

        getQuestions().then(response => {
            const questions = response;
            processQuestions(questions);
        })

    }

    async function updateImageURL(image) {
        var dataApiEndpoint, settings, response, responseJSON;
        console.log('Updating Image URL');
        dataApiEndpoint = image.getAttribute('data-api-endpoint');
        settings = {
            headers: {
                "X-CSRFToken": getCsrfToken()
            },
        }
        response = await fetch(dataApiEndpoint, settings);
        responseJSON = await response.json();

        image.setAttribute('src', `${responseJSON.url}&verifier=${responseJSON.uuid}`)
        return image;
    }

    async function processQuestions(questions) {
        var innerHTML = '';
        var question, answers, el, qText, newImage, svg, imagesLength, svgLength;

        if (questions.length === 0) {
            alert('No questions found');
            return;
        }

        for (let i = 0; i < questions.length; i++) {
            question = questions[i];
            qText = question.question_text;
            el = document.createElement('html');
            el.innerHTML = qText;

            // Update image URLS
            if (el.querySelectorAll('img:not(.equation_image)').length > 0) {
                for (let i = 0; i < el.querySelectorAll('img:not(.equation_image)').length; i++) {
                    newImage = await updateImageURL(el.querySelectorAll('img:not(.equation_image)')[i]);
                    el.querySelectorAll('img:not(.equation_image)')[i].replaceWith(newImage)
                }

                qText = el.querySelector('body').innerHTML;
                console.log("🚀 DEBUGGING ~ file: Export Quiz.user.js ~ line 107 ~ processQuestions ~ qText", qText);
            }


            // Update SVG image elements
            if (el.querySelectorAll('.equation_image').length > 0) {
                console.log('found an svg')
                for (let i = 0; i < el.querySelectorAll('.equation_image').length; i++) el.querySelectorAll('.equation_image')[i].setAttribute('src', `${el.querySelectorAll('.equation_image')[i].src}.svg`);

                qText = el.querySelector('body').innerHTML;
                console.log("🚀 DEBUGGING ~ file: Export Quiz.user.js ~ line 107 ~ processQuestions ~ qText", qText);
            }

            // Multiple choice questions
            if (question.question_type === 'multiple_choice_question') {
                // Question text
                innerHTML += `${qText.slice(0, 3)}${i + 1}. ${qText.slice(3)}`;

                // Answers
                answers = question.answers;
                for (let k = 0; k < answers.length; k++) {
                    if (answers[k].weight !== 0) innerHTML += `<p>*${alphabet[k]}. ${answers[k].text}</p>`; // Correct answer
                    else innerHTML += `<p>${alphabet[k]}. ${answers[k].text}</p>`; // Incorrect answer
                }
            }
            else if (question.question_type === 'essay_question') {
                innerHTML += `${qText.slice(0, 3)}${i + 1}. ${qText.slice(3)}`;
            }
            else {
                alert('Non supported question type found. Aborting.');
                return;
            }
        }

        //console.log("🚀 DEBUGGING ~ file: Export Quiz.user.js ~ line 133 ~ processQuestions ~ innerHTML", innerHTML);

        Export2Word(innerHTML, 'test');
        return;
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

    function Export2Word(innerHTML = '<p>This is a test!</p>', filename = 'test') {
        var preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        var postHtml = "</body></html>";

        // innerHTML = `<link rel=\"stylesheet\" href=\"https://instructure-uploads-apse2.s3.ap-southeast-2.amazonaws.com/account_198030000000000001/attachments/244067/app.min.css\">
        // <p><img id=\"2600260\" src=\"https://newcastle.test.instructure.com/courses/265/files/2600260/preview?verifier=QmSZiFpY437Jy9qEl1q6TtnCf9S43HF5ttEUcnhz\" alt=\"doggo.png\" width=\"215\" height=\"222\" 
        // data-api-endpoint=\"https://newcastle.test.instructure.com/api/v1/courses/265/files/2600260\" data-api-returntype=\"File\"></p>\n
        // <p>This is question 1. The answer is 1.</p><script src=\"https://instructure-uploads-apse2.s3.ap-southeast-2.amazonaws.com/account_198030000000000001/attachments/71032/canvas_global_app_150621.js\"></script>`

        //     innerHTML = `<p><img class="equation_image" title="\alpha+\beta" src="https://newcastle.test.instructure.com/equation_images/%255Calpha%252B%255Cbeta?scale=1.svg" alt="LaTeX: \alpha+\beta" width="146" height="65" data-equation-content="\alpha+\beta" x-canvaslms-safe-mathml="<math xmlns=&quot;http://www.w3.org/1998/Math/MathML&quot;>
        //     <mi>&amp;#x03B1;<!-- α --></mi>
        //     <mo>+</mo>
        //     <mi>&amp;#x03B2;<!-- β --></mi>
        //   </math>"></p>`

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




