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
    const uniqueLinkId = 'mw_export_classic_quiz';
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';

    function addExportButton(buttonText, buttonIcon) {
        var insBefore;
        if (document.getElementById(uniqueLinkId)) return;
        switch (window.location.href) {
            case `${window.location.origin}/courses/${courseId}/quizzes/${quizId}`:
            case `${window.location.origin}/courses/${courseId}/quizzes/${quizId}/`: {
                insBefore = document.querySelector('#toolbar-1 > li.quiz_menu');
                if (!insBefore) return;
                break;
            }
            case `${window.location.origin}/courses/${courseId}/quizzes/${quizId}/edit`:
            case `${window.location.origin}/courses/${courseId}/quizzes/${quizId}/edit/`: {
                insBefore = document.querySelector('#manage-toolbar > li > a.delete_quiz_link').parentNode;
                console.log("🚀 DEBUGGING ~ file: Export Classic Quiz.user.js ~ line 32 ~ addExportButton ~ insBefore", insBefore);
                if (!insBefore) return;
                break;
            }
            default: return;
        }
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
        //console.log(innerHTML);
        const innerHTM = `<p>1. <img id="2600260" src="https://newcastle.test.instructure.com/files/2600260/download?download_frd=1&amp;verifier=QmSZiFpY437Jy9qEl1q6TtnCf9S43HF5ttEUcnhz" alt="doggo.png" width="86" height="89" data-api-endpoint="https://newcastle.test.instructure.com/api/v1/courses/265/files/2600260" data-api-returntype="File"></p>
        <p>This is <strong>question</strong> 1. The answer is 1.</p>
        <p><img id="248028" src="https://newcastle.test.instructure.com/files/248028/download?download_frd=1&amp;verifier=SQNfPNQXZtjlXMTCeIedUaT8eDI2vOshAjFmtggl" alt="eq_ef28cd.gif" data-api-endpoint="https://newcastle.test.instructure.com/api/v1/courses/265/files/248028" data-api-returntype="File"></p>
        <p><img class="equation_image" title="\alpha+\beta" src="https://newcastle.test.instructure.com/equation_images/%255Calpha%252B%255Cbeta?scale=1.svg" alt="LaTeX: \alpha+\beta" data-equation-content="\alpha+\beta" x-canvaslms-safe-mathml="<math xmlns=&quot;http://www.w3.org/1998/Math/MathML&quot;>
          <mi>&amp;#x03B1;<!-- α --></mi>
          <mo>+</mo>
          <mi>&amp;#x03B2;<!-- β --></mi>
        </math>"></p>
        <p>&nbsp;</p>
        <p><img src="https://newcastle.test.instructure.com/equation_images/%5Csum_%7Bi%3D1%7D%5E%5Cinfty?scale=1.svg"></p>
        <p>&nbsp;</p><p>*a. 1</p><p>b. 2</p><p>c. 3</p><p>d. 4</p><br><p>2. QG Question 1</p><p>*a. 1<img id="2600257" src="https://newcastle.test.instructure.com/files/2600257/download?download_frd=1&amp;verifier=HjncZsbzGAL5xEP1hPQ3SXV1QP0FcHbFMu428fnU" alt="doggo.jpg" data-api-endpoint="https://newcastle.test.instructure.com/api/v1/courses/265/files/2600257" data-api-returntype="File"></p>
        <p><img class="equation_image" title="\Gamma" src="https://newcastle.test.instructure.com/equation_images/%255CGamma?scale=1.svg" alt="LaTeX: \Gamma" width="133" height="200" data-equation-content="\Gamma" x-canvaslms-safe-mathml="<math xmlns=&quot;http://www.w3.org/1998/Math/MathML&quot;>
          <mi mathvariant=&quot;normal&quot;>&amp;#x0393;<!-- Γ --></mi>
        </math>"></p><p>b. 2</p><p>c. 3</p><p>d. 4</p>
        <p><img src="https://images.unsplash.com/photo-1573865526739-10659fec78a5?crop=entropy&amp;cs=tinysrgb&amp;fit=max&amp;fm=jpg&amp;ixid=Mnw3NjA3NXwwfDF8c2VhcmNofDN8fGNhdHxlbnwxfHx8fDE2NDU3MDAyOTI&amp;ixlib=rb-1.2.1&amp;q=80&amp;w=1080" alt="selective focus photography of orange and white cat on brown table" width="136" height="190"></p><br><p>3. QG question 2</p><p>a. 1</p><p>b. 3</p><p>c. 4</p><p>*d. 5</p><br><p>Type: E</p><p>4. Just an essay.</p><br><p>Type: E</p><p>5. Blah</p><br><p>Type: File Upload</p><p>6. Hi this is a file upload.</p>
        <p><img src="https://newcastle.test.instructure.com/files/2886982/download?download_frd=1&amp;verifier=q238kyT998eOwmjVWzLrHWsCI9wrq6kGXgQSVS60" alt="dog-food-recall-1024x538.jpg" width="173" height="91" data-api-endpoint="https://newcastle.test.instructure.com/api/v1/courses/265/files/2886982" data-api-returntype="File"></p>
        <p><img src="https://images.unsplash.com/photo-1604430352727-c0555f882e01?crop=entropy&amp;cs=tinysrgb&amp;fit=max&amp;fm=jpg&amp;ixid=Mnw3NjA3NXwwfDF8c2VhcmNofDV8fGtpdHR5fGVufDF8fHx8MTY0NTgzODY2Ng&amp;ixlib=rb-1.2.1&amp;q=80&amp;w=1080" alt="orange tabby kitten on gray concrete floor" width="96" height="144"></p><br><p>Type: T/F</p><p>7. Hi this is a T/F.</p><p>*a. True</p><p>b. False</p><br><p>Type: MA</p><p>8. Hi this is a MA.</p><p>*a. 1</p><p>*b. 2</p><p>c. 3</p><br><p>Type: F</p><p>9. 3 plus [a] is 4?</p><p>a. 1</p><p>b. One</p><br><p>Type: FMB</p><p>10. Roses are [red, pink], violets are [blue].</p><br><p>Type: MD</p><p>11. The sky is [brown, *blue, red].</p>
        <p>Grass is [orange, *green].</p><br><p>Type: Text</p><p>12. Just a test question</p><br><p>Type: File Upload</p><p>13. Upload your file here.</p><br><p>14. Hi</p><p>*a. 1</p><p>b. 2</p><p>c. 3</p><p>d. 4</p><br><p>Type: MT</p><p>15. Match the number to its word.</p>
        <p><img src="https://images.unsplash.com/photo-1611604189291-82542bc9c822?crop=entropy&amp;cs=tinysrgb&amp;fit=max&amp;fm=jpg&amp;ixid=Mnw3NjA3NXwwfDF8c2VhcmNofDExfHxhbHBhY2F8ZW58MXx8fHwxNjQ1ODUxMTA2&amp;ixlib=rb-1.2.1&amp;q=80&amp;w=1080" alt="brown 4 legged animal on green grass field during daytime" width="173" height="133"></p><p>a. 1 = One</p><p>b. 2 = Two</p><p>c. 3 = Three</p><p>d.  = </p><p>Distractors: Four, Five</p><br><p>Type: Numerical</p><p>16. Numerical answer question.</p><p>*a. Answer in the range: between 1 and 2.</p><p>*b. Answer with precision: 1 with precision 5.</p><p>*c. Exact answer: 2 with error margin 0.05.</p><br><p>Type: Formula</p><p>17. What is 5 plus [x] minus [y]?</p><p>[x]: min = 5, max = 8, decimals = 0</p><p>[y]: min = 1, max = 3, decimals = 2</p><p>Formula: 5+x-y</p><p>Answer tolerance: 10%</p>`
        if (innerHTML) Export2Word(innerHTML, quizName);
    }

    function isHTML(string) {
        const el = document.createElement('div');
        el.innerHTML = string;
        if (el.childNodes.length > 0 && el.childNodes[0].tagName === 'P') return true;
        return false;
    }

    function addNumber(string, i) {
        const el = document.createElement('body');
        if (isHTML(string)) {
            el.innerHTML = string;
            el.childNodes[0].innerHTML = `${i + 1}. ${el.childNodes[0].innerHTML}`
        }
        else {
            const p = document.createElement('p');
            p.innerHTML = `${i + 1}. ${string}`;
            el.appendChild(p);
        }
        return el.innerHTML;
    }

    function addLetter(string, k, correct = false) {
        const el = document.createElement('body');
        if (isHTML(string)) {
            el.innerHTML = string;
            el.childNodes[0].innerHTML = correct ? `*${alphabet[k]}. ${el.childNodes[0].innerHTML}` : `${alphabet[k]}. ${el.childNodes[0].innerHTML}`;
        }
        else {
            const p = document.createElement('p');
            p.innerHTML = correct ? `*${alphabet[k]}. ${string}` : `${alphabet[k]}. ${string}`;
            el.appendChild(p);
        }
        return el.innerHTML;
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

    async function updateGraphics(question) {
        var questionEl, answerEl, newImage, images, span, paragraphs, re, match, height, width, text, html;
        const svgHeight = 23;

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
                height = Number(images[i].getAttribute('height'));
                width = Number(images[i].getAttribute('width'));
                width = svgHeight / (height / width)
                images[i].setAttribute('height', svgHeight.toString());
                images[i].setAttribute('width', width.toString());
            }
        }

        // Convert inline LaTeX to images
        paragraphs = questionEl.querySelectorAll('p');
        if (paragraphs.length > 0) {
            // console.log('This question text has SVG images.')
            for (let i = 0; i < paragraphs.length; i++) {
                re = /\\\((.+)\\\)/;
                match = re.exec(paragraphs[i].innerHTML);
                if (match) {
                    newImage = document.createElement('img');
                    newImage.setAttribute('src', `${window.location.origin}/equation_images/${encodeURIComponent(match[1])}?scale=1.svg`);
                    paragraphs[i].innerHTML = paragraphs[i].innerHTML.replace(match[0], newImage.outerHTML);
                    match.length = 0;
                }
            }
        }

        question.question_text = questionEl.innerHTML;

        if (question.answers.length > 0) {
            // console.log(`This question contains answers.`);
            for (let k = 0; k < question.answers.length; k++) {
                ({ html, text } = question.answers[k])
                answerEl = document.createElement('body');
                if (!html) html = text;
                answerEl.innerHTML = html;

                // Update image URLS
                images = answerEl.querySelectorAll('img[data-api-endpoint]')
                if (images.length > 0) {
                    // console.log('This answer has regular images.');
                    for (let i = 0; i < images.length; i++) {
                        newImage = await updateImageURL(images[i]);
                        images[i].replaceWith(newImage)
                    }
                    question.answers[k].html = answerEl.innerHTML;
                }

                // Update SVG image elements
                images = answerEl.querySelectorAll('.equation_image');
                if (images.length > 0) {
                    // console.log('This answer has SVG images.');
                    for (let i = 0; i < images.length; i++) {
                        span = images[i].parentNode.querySelector('span');
                        if (span) span.remove();
                        images[i].setAttribute('src', `${images[i].src}.svg`);
                        height = Number(images[i].getAttribute('height'));
                        width = Number(images[i].getAttribute('width'));
                        width = svgHeight / (height / width)
                        images[i].setAttribute('height', svgHeight.toString());
                        images[i].setAttribute('width', width.toString());
                    }
                    question.answers[k].html = answerEl.innerHTML;
                }
                // Convert inline LaTeX to images

                re = /\\\((.+)\\\)/;
                match = re.exec(answerEl.innerHTML);
                if (match) {
                    newImage = document.createElement('img');
                    newImage.setAttribute('src', `${window.location.origin}/equation_images/${encodeURIComponent(match[1])}?scale=1.svg`);
                    answerEl.innerHTML = answerEl.innerHTML.replace(match[0], newImage.outerHTML);
                    match.length = 0;
                    question.answers[k].html = answerEl.innerHTML;
                }

            }

        }

        return question;
    }

    async function getQuestionOrderIds() {
        const responseText = await $.ajax({
            url: `${window.location.origin}/courses/${courseId}/quizzes/${quizId}/edit`,
            success: function (data) {
                return data;
            }
        });

        const doc = document.createElement('div');
        doc.innerHTML = responseText;

        const questionNodes = doc.querySelectorAll('div.question_text.user_content[id]:not(#question_new_question_text)');
        const questionNodesArray = Array.from(questionNodes);
        const questionOrderIds = questionNodesArray.map(node => Number(node.id.split('_')[1]));

        return questionOrderIds;
    }

    async function orderQuestions(questions) {
        const questionOrderIds = await getQuestionOrderIds();
        if (questions.length !== questionOrderIds.length) {
            return false;
        }
        const orderedQuestions = questions.sort((a, b) => questionOrderIds.indexOf(a.id) - questionOrderIds.indexOf(b.id));
        return orderedQuestions;
    }

    async function processQuestions(questions) {
        var innerHTML = '';
        var question, answers, text, type, html, weight, left, right, distractors, answerType, start, end, approximate, precision, exact, margin, variables, answer_tolerance, formulas, name, min, max, decimals;
        var blankIds = [];
        var matches = [];

        if (questions.length === 0) {
            alert('No questions found. Questions in banks need to be done manually.');
            return;
        }

        const columns = ["id", "quiz_group_id", "question_text"];
        console.log('Unordered questions:')
        console.table(questions, columns);

        // Canvas' Quiz Questions API includes a 'position' parameter but it always returns null (it is broken). Therefore, ordering of questions must be done based on a quiz submission. The function orderQuestions identifies the most recent submission and reorders questions (if necessary) to reflect this order.
        //questions = await orderQuestions(questions)
        questions = await orderQuestions(questions)
        if (!questions) {
            alert('Number of questions retrieved by API does not match number of questions scraped from quiz. Aborting.')
            return;
        }

        console.log('Ordered questions:')
        console.table(questions, columns);

        for (let i = 0; i < questions.length; i++) {
            // console.log(`===================== NOW RUNNING QUESTION ${i + 1} =====================`);
            question = questions[i];
            question = await updateGraphics(question);
            ({ question_text: text, question_type: type, answers, } = question)
            //if (!isHTML(text)) text = `<p>${text}</p>`;
            blankIds.length = 0;

            if (i !== 0) innerHTML += '<br>';

            // Multiple choice questions
            switch (type) {
                case 'multiple_choice_question': {
                    innerHTML += addNumber(text, i);
                    for (let k = 0; k < answers.length; k++) {
                        ({ html, text, weight, } = answers[k]);
                        if (html) text = html;
                        if (weight !== 0) innerHTML += addLetter(text, k, true); // Correct answer
                        else innerHTML += addLetter(text, k); // Incorrect answer
                    }
                    break;
                }
                case 'essay_question': {
                    innerHTML += `<p>Type: E</p>${addNumber(text, i)}`;
                    break;
                }
                case 'file_upload_question': {
                    innerHTML += `<p>Type: File Upload</p>${addNumber(text, i)}`;
                    break;
                }
                case 'true_false_question': {
                    innerHTML += `<p>Type: T/F</p>${addNumber(text, i)}`;
                    for (let k = 0; k < answers.length; k++) {
                        ({ html, text, weight } = answers[k])
                        if (answers[k].weight !== 0) innerHTML += addLetter(text, k, true); // Correct answer
                        else innerHTML += addLetter(text, k); // Incorrect answer
                    }
                    break;
                }
                case 'multiple_answers_question': {
                    innerHTML += `<p>Type: MA</p>${addNumber(text, i)}`;
                    for (let k = 0; k < answers.length; k++) {
                        ({ html, text, weight, } = answers[k]);
                        if (html) text = html;
                        if (weight !== 0) innerHTML += addLetter(text, k, true); // Correct answer
                        else innerHTML += addLetter(text, k); // Incorrect answer
                    }
                    break;
                }
                case 'short_answer_question': { // Fill in the blank
                    innerHTML += `<p>Type: F</p>${addNumber(text, i)}`;
                    for (let k = 0; k < answers.length; k++) {
                        ({ text } = answers[k]);
                        innerHTML += addLetter(text, k);
                    }
                    break;
                }
                case 'fill_in_multiple_blanks_question': {
                    answers.forEach(answer => {
                        if (blankIds.indexOf(answer.blank_id) === -1) blankIds.push(answer.blank_id) // Creating array of unique blank ids
                    })
                    for (let k = 0; k < blankIds.length; k++) {
                        matches.length = 0;
                        for (let j = 0; j < answers.length; j++) {
                            if (answers[j].blank_id === blankIds[k]) matches.push(answers[j].text);
                        }
                        text = text.replace(`[${blankIds[k]}]`, `[${matches.join(', ')}]`)
                    }
                    innerHTML += `<p>Type: FMB</p>${addNumber(text, i)}`;
                    break;
                }
                case 'multiple_dropdowns_question': {
                    //debugger;
                    answers.forEach(answer => {
                        if (blankIds.indexOf(answer.blank_id) === -1) blankIds.push(answer.blank_id) // Creating array of unique blank ids
                    })
                    for (let k = 0; k < blankIds.length; k++) {
                        matches.length = 0;
                        for (let j = 0; j < answers.length; j++) {
                            if (answers[j].blank_id === blankIds[k]) matches.push(answers[j].weight !== 0 ? `*${answers[j].text}` : answers[j].text);
                        }
                        text = text.replace(`[${blankIds[k]}]`, `[${matches.join(', ')}]`)
                    }
                    innerHTML += `<p>Type: MD</p>${addNumber(text, i)}`;
                    break;
                }
                case 'text_only_question': {
                    innerHTML += `<p>Type: Text</p>${addNumber(text, i)}`;
                    break;
                }
                case 'matching_question': {
                    innerHTML += `<p>Type: MT</p>${addNumber(text, i)}`;
                    ({ matching_answer_incorrect_matches: distractors } = question)
                    for (let k = 0; k < answers.length; k++) {
                        ({ left, right } = answers[k]);
                        innerHTML += addLetter(`${left} = ${right}`, k);
                    }
                    if (distractors) innerHTML += `<p>Distractors: ${distractors.split('\n').join(', ')}</p>`
                    break;
                }
                case 'numerical_question': {
                    innerHTML += `<p>Type: Numerical</p>${addNumber(text, i)}`;
                    for (let k = 0; k < answers.length; k++) {
                        ({ numerical_answer_type: answerType, start, end, approximate, precision, exact, margin } = answers[k]);
                        switch (answerType) {
                            case 'range_answer': {
                                innerHTML += addLetter(`Answer in the range: between ${start} and ${end}.`, k, true);
                                break;
                            }
                            case 'precision_answer': {
                                innerHTML += addLetter(`Answer with precision: ${approximate} with precision ${precision}.`, k, true);
                                break;
                            }
                            case 'exact_answer': {
                                innerHTML += addLetter(`Exact answer: ${exact} with error margin ${margin}.`, k, true);
                                break;
                            }
                        }
                    }
                    break;
                }
                case 'calculated_question': {
                    innerHTML += `<p>Type: Formula</p>${addNumber(text, i)}`;
                    ({ variables, answer_tolerance, formulas } = question)
                    for (let k = 0; k < variables.length; k++) {
                        ({ name, min, max, scale: decimals } = variables[k])
                        innerHTML += `<p>[${name}]: min = ${min}, max = ${max}, decimals = ${decimals}</p>`;
                    }
                    innerHTML += `<p>Formula: ${formulas.at(-1).formula}</p><p>Answer tolerance: ${answer_tolerance}</p>`
                    break;
                }
                default: {
                    debugger;
                    alert('Non supported question type found. Aborting.');
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

    function Export2Word(innerHTML, filename = 'quiz_export') {
        var preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body style='font-family: Arial'>";
        var postHtml = "</body></html>";

        var html = `${preHtml}${innerHTML}${postHtml}`;
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

    if (document.readyState !== 'loading') {
        addExportButton('Export Quiz', 'icon-download');
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            addExportButton('Export Quiz', 'icon-download');
        });
    }

})();




