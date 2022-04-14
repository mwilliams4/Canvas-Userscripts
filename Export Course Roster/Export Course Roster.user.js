// ==UserScript==
// @name         Export Course Roster
// @namespace    mw784
// @version      1
// @license      MIT
// @description  Exports the course roster from the People area, bypassing the need to go through New Analytics
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/courses/*/users
// @include      https://newcastle.test.instructure.com/courses/*/users
// @include      https://newcastle.beta.instructure.com/courses/*/users
// ==/UserScript==

(function () {
    'use strict';

    const courseId = getCourseId();

    const uniqueLinkId = 'mw_export_course_roster'

    window.addEventListener('load', () => {
        addButton();
    });

    function checkId() {
        if (Number(courseId)) return true;
        else return false;
    }

    function addButton() {
        var parent;
        if (document.getElementById(uniqueLinkId)) return;

        parent = document.querySelector('#people-options > ul');
        if (!parent) return;

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
        icon.classList.add('icon-download');
        icon.setAttribute('aria-hidden', 'true');
        anchor.appendChild(icon);
        anchor.appendChild(document.createTextNode(` Export Course Roster`));
        listItem.appendChild(anchor)
        parent.appendChild(listItem);
        return;
    }

    async function processRequest() {
        var filteredEnrolments;
        if (!checkId()) {
            alert('Could not determine course. Aborting.');
            return;
        }

        const csvArr = [];
        toggleLoadingSpinner();

        const enrolments = await getEnrolments();
debugger;
        filteredEnrolments = enrolments.map(enrolment => {
            const userEnrolments = []
            for (let i = 0; i < enrolment.enrollments.length; i++) {
                userEnrolments.push(
                    {
                    id: enrolment.id,
                    created_at: new Date(enrolment.enrollments[i].created_at).toLocaleString(),
                    name: enrolment.name,
                    sis_user_id: enrolment.sis_user_id,
                    email: enrolment.email,
                    sis_section_id: enrolment.enrollments[i].sis_section_id ? enrolment.enrollments[i].sis_section_id : '',
            }
                    )
            }
            return userEnrolments

        });

        filteredEnrolments = filteredEnrolments.flat()

        const headers = Object.keys(filteredEnrolments[0]);
        csvArr.push(headers, ...filteredEnrolments.map(enrolment => Object.values(enrolment)));

        const course = await getCourse();
        const fileName = course.name;

        exportToCsv(fileName, csvArr)
        toggleLoadingSpinner();

        return;
    }

    async function getCourse() {
        var url = `${window.location.origin}/api/v1/courses/${courseId}`;
        var response;
        var settings = {
            headers: {
                "X-CSRFToken": getCsrfToken()
            },
        }

        response = await fetch(url, settings)

        if (!response.ok) {
            return false;
        }

        const course = await response.json();

        return course;
    }

    async function getEnrolments() {
        var enrolments = [];
        var parsedLinkHeader;

        var url = `${window.location.origin}/api/v1/courses/${courseId}/users?enrollment_state[]=active&per_page=100&include[]=enrollments`;
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

    function exportToCsv(filename, rows) {
        var processRow = function (row) {
            var finalVal = '';
            for (var j = 0; j < row.length; j++) {
                var innerValue = row[j] === null ? '' : row[j].toString();
                if (row[j] instanceof Date) {
                    innerValue = row[j].toLocaleString();
                };
                var result = innerValue.replace(/"/g, '""');
                if (result.search(/("|,|\n)/g) >= 0)
                    result = '"' + result + '"';
                if (j > 0)
                    finalVal += ',';
                finalVal += result;
            }
            return finalVal + '\n';
        };

        var csvFile = '';
        for (var i = 0; i < rows.length; i++) {
            csvFile += processRow(rows[i]);
        }

        var blob = new Blob([csvFile], {
            type: 'text/csv;charset=utf-8;'
        });
        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, filename);
        } else {
            var link = document.createElement("a");
            if (link.download !== undefined) { // feature detection
                // Browsers that support HTML5 download attribute
                var url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", filename);
                link.style.visibility = 'hidden';
                link.click();
            }
        }
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