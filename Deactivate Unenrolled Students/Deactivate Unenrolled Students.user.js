// ==UserScript==
// @name         Deactive Unenrolled Students
// @namespace    mw784
// @version      1
// @license      MIT
// @description  Deactivates unenrolled students in Canvas. Detects unenrolled students by looking for students who are not in the default section.
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/courses/*
// @include      https://newcastle.test.instructure.com/courses/*
// @include      https://newcastle.beta.instructure.com/courses/*
// ==/UserScript==

(function () {
    'use strict';

    const courseId = getCourseId();

    const uniqueLinkId = 'mw_deactivate_students'

    if (document.readyState !== 'loading') {
        addButton('Deactivate Students', 'icon-trouble');
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            addButton('Deactivate Students', 'icon-trouble');
        });
    }

    function checkId() {
        if (Number(courseId)) return true;
        else return false;
    }



    function addButton(buttonText, buttonIcon) {
        var insAfter;
        if (document.getElementById(uniqueLinkId)) return;


        insAfter = document.querySelector('#course_show_secondary > a:last-of-type');
        if (!insAfter) return;

        const anchor = document.createElement('a');
        anchor.classList.add('btn', 'button-sidebar-wide');
        anchor.id = uniqueLinkId;
        anchor.addEventListener('click', () => {
            processRequest();
        });
        const icon = document.createElement('i');
        icon.classList.add(buttonIcon);
        anchor.appendChild(icon);
        anchor.appendChild(document.createTextNode(` ${buttonText}`));
        insAfter.parentNode.insertBefore(anchor, insAfter.nextSibling);
        return;
    }

    async function processRequest() {

        if (!checkId()) {
            alert('Couldn\'t identify course.')
            return;
        }

        const enrolments = await getEnrolments();
        console.log(enrolments);

        return;
    }

    async function getEnrolments() {
        var enrolments = [];
        var parsedLinkHeader;

        var url = `${window.location.origin}/api/v1/courses/${courseId}/enrollments?type[]=StudentEnrollment&per_page=100`;
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

})();