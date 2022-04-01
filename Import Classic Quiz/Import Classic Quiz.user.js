// ==UserScript==
// @name         Import Classic Quiz
// @namespace    mw784
// @version      1
// @license      MIT
// @description  Imports a classic quiz to Canvas from a Word document.
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/courses/*
// @include      https://newcastle.test.instructure.com/courses/*
// @include      https://newcastle.beta.instructure.com/courses/*
// ==/UserScript==

(function () {
    'use strict';

    const courseId = getCourseId();

    const uniqueLinkId = 'mw_import_classic_quiz'

    window.addEventListener('load', () => {
        addButton('Import Classic Quiz', 'icon-import');
    });

    function checkId() {
        if (Number(courseId)) return true;
        else return false;
    }

    function addButton(buttonText, buttonIcon) {
        var insBefore;
        if (document.getElementById(uniqueLinkId)) return;


        insBefore = document.querySelector('#course_show_secondary > a');
        if (!insBefore) return;

        const anchor = document.createElement('a');
        anchor.classList.add('btn', 'button-sidebar-wide');
        anchor.id = uniqueLinkId;
        anchor.addEventListener('click', () => {
            openFileChooser();
        });
        const icon = document.createElement('i');
        icon.classList.add(buttonIcon);
        anchor.appendChild(icon);
        anchor.appendChild(document.createTextNode(` ${buttonText}`));
        insBefore.parentNode.insertBefore(anchor, insBefore);

        const input = document.createElement('input');
        input.id = 'fileId';
        input.setAttribute('type', 'file');
        input.style.display = 'none';
        input.addEventListener('change', () => {
            console.log(input.files[0])
            processRequest(input.files[0]);
        })
        document.body.appendChild(input);
        console.log("🚀 DEBUGGING ~ file: Import Classic Quiz.user.js ~ line 53 ~ addButton ~ input", input);

        return;
    }

    function openFileChooser() {
        document.getElementById('fileId').click();
    }

    async function processRequest(file) {
        if (!checkId()) {
            alert('Couldn\'t identify course.')
            return;
        }

        if (!file) {
            alert('Could not determine file. Aborting.');
            return;
        }

        if (file.type !== 'application/msword' && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            alert('File must be a Word document. Aborting.');
            return;
        }

        toggleLoadingSpinner();
        // debugger;
        // var fileReader = new FileReader();
        // fileReader.onload = function (fileLoadedEvent) {
        //     var textFromFileLoaded = fileLoadedEvent.target.result;
        //     console.log(textFromFileLoaded);
        //     // document.getElementById("inputTextToSave").value = textFromFileLoaded;
        // };

        // fileReader.readAsBinaryString(file, "UTF-8");

        const contents = loadDocx(file);
        console.log(contents);

        toggleLoadingSpinner();

        return;
    }

    function loadDocx(filename) {
        // Read document.xml from docx document
        const AdmZip = require("adm-zip");
        const zip = new AdmZip(filename);
        const xml = zip.readAsText("word/document.xml");
        // Load xml DOM
        const cheerio = require('cheerio');
        $ = cheerio.load(xml, {
            normalizeWhitespace: true,
            xmlMode: true
        })
        // Extract text
        let out = new Array()
        $('w\\:t').each((i, el) => {
            out.push($(el).text())
        })
        return out
    }

    async function getCourseDetails() {
        var url = `${window.location.origin}/api/v1/courses/${courseId}`;
        var response, data;
        var settings = {
            headers: {
                "X-CSRFToken": getCsrfToken()
            },
        }

        response = await fetch(url, settings)

        if (!response.ok) {
            return false;
        }

        data = await response.json();

        const courseDetails = {
            name: data.name,
            sisCourseId: data.sis_course_id,
        }

        url = `${window.location.origin}/api/v1/accounts/1/terms/${data.enrollment_term_id}`;

        response = await fetch(url, settings)

        if (!response.ok) {
            return false;
        }

        data = await response.json();

        courseDetails.sisTermId = data.sis_term_id;

        return courseDetails;
    }

    function identifyUnenrolledStudents(sectionEnrolments, courseDetails) {
        var sections, match;
        const sectionSubstring = `${courseDetails.sisCourseId}:${courseDetails.sisTermId}`;
        const unenrolledStudents = [];
        const enrolledStudents = [];

        sectionEnrolments.forEach(student => {
            sections = student.sections.map(section => section.sectionSISId);
            match = sections.find(section => {
                if (section && section.includes(sectionSubstring)) return true;
            })
            if (match) enrolledStudents.push(student);
            else unenrolledStudents.push(student);
        })

        return [enrolledStudents, unenrolledStudents];
    }

    function sortEnrolments(enrolments) {
        var sectionEnrolments = [];
        var section, lastAccess;

        enrolments.forEach(enrolment => {
            section = {
                sectionSISId: enrolment.sis_section_id,
                enrolmentId: enrolment.id,
            }

            lastAccess = new Date(enrolment.last_activity_at);

            if (!(sectionEnrolments.map(enr => enr.studentId).includes(enrolment.sis_user_id))) {
                sectionEnrolments.push({
                    studentId: enrolment.sis_user_id,
                    name: enrolment.user.name,
                    lastAccess: lastAccess.toLocaleDateString(),
                    sections: [section],
                })
            } else {
                sectionEnrolments[sectionEnrolments.map(enr => enr.studentId).indexOf(enrolment.sis_user_id)].sections.push(section);
            }
        })

        return sectionEnrolments;
    }

    async function getEnrolments() {
        var enrolments = [];
        var parsedLinkHeader;

        var url = `${window.location.origin}/api/v1/courses/${courseId}/enrollments?type[]=StudentEnrollment&state[]=active&per_page=100`;
        var settings = {
            headers: {
                "X-CSRFToken": getCsrfToken()
            },
        }

        var i = 1;
        while (url !== null) {
            const response = await fetch(url, settings)

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            enrolments = [...enrolments, ...data];

            parsedLinkHeader = parseLinkHeader(response.headers.get('link'));

            if (parsedLinkHeader && parsedLinkHeader.next) {
                url = parsedLinkHeader.next;
            } else {
                url = null;
            }
            console.log(`Fetched from page ${i}. Enrolments: ${enrolments.length}.`);
            i++;
        }
        return enrolments;
    }

    function parseLinkHeader(header) {
        if (header.length == 0) {
            throw new Error("input must not be of zero length");
        }

        // Split parts by comma
        var parts = header.split(',');
        var links = {};
        // Parse each part into a named link
        parts.forEach(p => {
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

    function toggleLoadingSpinner() {
        const loading = document.querySelector('.loading');
        if (loading) {
            if (loading.style.display === 'none') loading.style.removeProperty('display');
            else loading.style.display = 'none';
            return;
        }

        const el = document.createElement('div');
        el.classList.add('loading');
        el.value = 'Loading&#8230;';
        document.body.appendChild(el)

        var spinnerStyle = document.createElement('style');
        spinnerStyle.type = 'text/css';
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