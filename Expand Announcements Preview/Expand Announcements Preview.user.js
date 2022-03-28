// ==UserScript==
// @name         Expand Announcements Preview
// @namespace    mw784
// @version      1
// @license      MIT
// @description  A simple script to expand the preview of announcements in Canvas
// @author       Matthew Williams
// @include      https://canvas.newcastle.edu.au/courses/*/announcements
// @include      https://newcastle.test.instructure.com/courses/*/announcements
// @include      https://newcastle.beta.instructure.com/courses/*/announcements
// ==/UserScript==

(function () {
    'use strict';

    const courseId = getCourseId();

    getAnnouncements().then(res => {
        const announcements = res;
        if (announcements.length !== 0) expandPreviews();
    })

    function expandPreviews() {
        const announcements = document.querySelectorAll('.ic-announcement-row__content')
        if (announcements && announcements.length === 0) setTimeout(expandPreviews, 100)
        announcements.forEach(announcement => {
            announcement.style.whiteSpace = 'pre-wrap';
        })
    }

    async function getAnnouncements() {
        var announcements = [];
        var parsedLinkHeader;

        var url = `${window.location.origin}/api/v1/announcements?context_codes[]=course_${courseId}&start_date=0000-01-01&end_date=9999-01-01`

        var settings = {
            headers: {
                "X-CSRFToken": getCsrfToken()
            },
        }

        console.log(`Fetching announcements.`);

        var i = 1;
        while (url !== null) {
            const response = await fetch(url, settings)

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            announcements = [...announcements, ...data];

            parsedLinkHeader = parseLinkHeader(response.headers.get('link'));

            if (parsedLinkHeader && parsedLinkHeader.next) {
                url = parsedLinkHeader.next;
            } else {
                url = null;
            }
            console.log(`Fetched from page ${i}. Length: ${announcements.length}.`);
            i++;
        }
        return announcements;
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