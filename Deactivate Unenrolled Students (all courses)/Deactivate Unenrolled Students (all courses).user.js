// ==UserScript==
// @name         Deactivates Unenrolled Students (all courses)
// @namespace    mw784
// @version      1
// @license      MIT
// @description  Deactivates unenrolled students across all courses (within the sub-accounts and terms specified below)
// @author       Matthew Williams
// @include      /^https:\/\/canvas\.newcastle\.edu\.au\/$/
// @include      /^https:\/\/newcastle\.test\.instructure\.com\/$/
// @include      /^https:\/\/newcastle\.beta\.instructure\.com\/$/
// ==/UserScript==

(function () {
    'use strict';

    const uniqueLinkId = 'mw_deactivate_unenrolled_students_all'

    const courseSubAccounts = ['CESE', 'CHMW', 'CHSF', 'ELFSC', 'UNCIE'];
    const courseTerms = [
            6240, 6280, 6225, 6255, 6285, 6215, 6245, 6275, 6200, 6211, 6260, 6231, 6232, 6233,
            // 6340, 6380, 6325, 6355, 6385, 6315, 6345, 6375, 6300, 6311, 6360, 6331, 6332, 6333,
            // 6440, 6480, 6425, 6455, 6485, 6415, 6445, 6475, 6400, 6411, 6460, 6431, 6432, 6433,
            // 6540, 6580, 6525, 6555, 6585, 6515, 6545, 6575, 6500, 6511, 6560, 6531, 6532, 6533,
            // 6640, 6680, 6625, 6655, 6685, 6615, 6645, 6675, 6600, 6611, 6660, 6631, 6632, 6633,
        ]
        .map(termCode => termCode.toString());

    window.addEventListener('load', () => {
        addButton();
    });

    function addButton() {
        var parent;
        if (document.getElementById(uniqueLinkId)) return;

        parent = document.querySelector('#right-side > div.events_list.recent_feedback + div');
        if (!parent) return;

        const anchor = document.createElement('a');
        anchor.classList.add('Button', 'button-sidebar-wide');
        anchor.id = uniqueLinkId;
        anchor.addEventListener('click', () => {
            processRequest();
        });
        anchor.appendChild(document.createTextNode(` Deactivate Students`));
        parent.appendChild(anchor);
        return;
    }

    async function processRequest() {
        let token;
        let logs = [];
        const csvLogArr = [];
        const csvArr = [];
        var enrolments, sectionEnrolments, unenrolledStudents, table, course;
        alert('Ensure console is open before proceeding.');

        switch (window.location.origin) {
            case 'https://newcastle.test.instructure.com': {
                token = localStorage.getItem('token_test');
                if (!token) {
                    alert('Could not find token.');
                    return;
                }
                break;
            }
            case 'https://canvas.newcastle.edu.au': {
                token = localStorage.getItem('token_prod');
                if (!token) {
                    alert('Could not find token.');
                    return;
                }
                break;
            }
            case 'https://newcastle.beta.instructure.com': {
                token = localStorage.getItem('token_beta');
                if (!token) {
                    alert('Could not find token.');
                    return;
                }
                break;
            }
            default: {
                alert('Could not determine domain. Aborting.');
                break;
            }
        }

        toggleLoadingSpinner();

        const courses = await getCourses();

        if (courses && courses.length === 0) {
            alert('Could not find any courses');
            return;
        }

        const sections = await getSections(courses);

        const coursesWithManualSections = identifyCoursesWithManualSections(courses, sections);

        // ### Exporting list of courses with manual sections
        const filteredCoursesWithManualSections = coursesWithManualSections.map(course => {
            return {
                name: course.name,
                sis_course_id: course.sis_course_id,
                sections: course.sections.map(section => section.name).join(', '),
            }
        });
        csvArr.push(Object.keys(filteredCoursesWithManualSections[0]), ...filteredCoursesWithManualSections.map(course => Object.values(course)));
        exportToCsv('courses_with_manual_sections', csvArr);
        // ### Exporting list of courses with manual sections

        console.table(coursesWithManualSections, ['name', 'sis_course_id', 'sections']);
        if (!confirm(`Found ${coursesWithManualSections.length} courses with manual sections. See console for details.
Continue?`));

        for (let i = 0; i < coursesWithManualSections.length; i++) {
            course = coursesWithManualSections[i];
            console.log(`Now running ${course.name}.\n(course ${i+1} of ${coursesWithManualSections.length})`);
            enrolments = await getEnrolments(course);
            if (!enrolments || enrolments.length === 0) {
                console.log('Could not fetch course enrolments. Aborting.');
                return;
            }

            sectionEnrolments = sortEnrolments(enrolments);

            unenrolledStudents = identifyUnenrolledStudents(sectionEnrolments, course)[1];

            if (unenrolledStudents.length === 0) {
                console.log(`Could not find any unenrolled students for ${course.name}.`);
                continue;
            }

            table = JSON.parse(JSON.stringify(unenrolledStudents));
            table.forEach(unenrolledStudent => {
                unenrolledStudent.sections = unenrolledStudent.sections.map(section => section.sectionSISId ? section.sectionSISId : 'null').join();
            })

            console.log('Unenrolled Students:')
            console.table(table);

            if (confirm(`Found ${unenrolledStudents.length} unenrolled students in ${course.name}.
Check console for details.
Continue?`)) {
                logs = [...logs, ...(await deactivateStudents(unenrolledStudents, course, token))];
            }
        }

        if (logs.length > 0) {
            const headers = Object.keys(logs[0]);
            csvLogArr.push(headers, ...logs.map(log => Object.values(log)));

            const today = new Date();

            exportToCsv(`deactivation_${today.toLocaleDateString()}`, csvLogArr);
        }
        console.log('Complete.');

        toggleLoadingSpinner();

        return;
    }

    async function deactivateStudents(unenrolledStudents, course, token) {
        var response, student, section, date, deactivated;
        var log = [];

        for (let i = 0; i < unenrolledStudents.length; i++) {
            if (unenrolledStudents[i].sections && unenrolledStudents[i].sections.length === 0) continue;

            for (let j = 0; j < unenrolledStudents[i].sections.length; j++) {
                // debugger; // Kept here to allow students to be deactivated one at a time.
                student = unenrolledStudents[i];
                section = student.sections[j];
                var url = `${window.location.origin}/api/v1/courses/${course.id}/enrollments/${section.enrolmentId}?task=inactivate`;
                var settings = {
                    method: 'DELETE',
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                }

                response = await fetch(url, settings);

                if (!response.ok) {
                    console.log(`Failed to deactivate ${student.studentId} in section ${section.sectionSISId}`);
                    deactivated = 'failed';
                } else {
                    console.log(`Deactivated ${student.studentId} in section ${section.sectionSISId}`);
                    deactivated = 'success';
                }

                date = new Date();
                log.push({
                    deactivate: deactivated,
                    sis_user_id: student.studentId,
                    name: student.name,
                    date: date.toString(),
                    course_name: course.name,
                    sis_course_id: course.sis_course_id,
                    sis_section_id: section.sectionSISId ? section.sectionSISId : '',
                    term_name: course.term.name,
                    sis_term_id: course.term.sis_term_id,
                })
            }
        }

        return log;
    }

    function identifyUnenrolledStudents(sectionEnrolments, course) {
        var sections, match;
        const sectionSubstring = `${course.sis_course_id}:`;
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

    async function getEnrolments(course) {
        var enrolments = [];
        var parsedLinkHeader;

        var url = `${window.location.origin}/api/v1/courses/${course.id}/enrollments?type[]=StudentEnrollment&state[]=active&per_page=100`;
        var settings = {
            headers: {
                "X-CSRFToken": getCsrfToken()
            },
        }

        console.log('Fetching enrolments...')
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
        }

        return enrolments;
    }

    function identifyCoursesWithManualSections(courses, sections) {
        var OCMCohortSectionSubstring, OCMDefaultSectionSubstring;

        courses.forEach(course => {
            // if (course.id == 19111) debugger;
            course.sections = sections.filter(section => section.course_id === course.id);
            OCMCohortSectionSubstring = `${course.sis_course_id}:`;
            OCMDefaultSectionSubstring = `${course.sis_course_id}:default`;
            course.hasOCMSections = course.sections.find(section => {
                if (section && section.sis_section_id && (section.sis_section_id.includes(OCMCohortSectionSubstring) || section.sis_section_id.includes(OCMDefaultSectionSubstring))) return true;
            }) ? true : false;
            course.hasManualSections = course.sections.find(section => {
                if (!section) return false;
                if (!section.sis_section_id) return true;
                if (!(section.sis_section_id.includes(OCMCohortSectionSubstring) || section.sis_section_id.includes(OCMDefaultSectionSubstring))) return true;
            }) ? true : false;
        })

        return courses.filter(course => (course.hasManualSections === true && course.hasOCMSections === true))
    }

    async function getSections(courses) {
        var sections = [];
        var parsedLinkHeader;
        var urls = [];
        const asyncRequests = 25;
        var flag = false;
        var iteration = 0;
        const maxIterations = 100;

        console.log('Fetching sections...');
        while (flag === false) {
            urls = courses.slice(iteration * asyncRequests, iteration * asyncRequests + asyncRequests)
                .map(course => `${window.location.origin}/api/v1/courses/${course.id}/sections?per_page=100`);

            if (urls && urls.length === 0) flag = true;

            // urls.forEach(url => {
            //     if (url.includes('19111')) debugger;
            // })

            try {
                var settings = {
                    headers: {
                        "X-CSRFToken": getCsrfToken()
                    },
                }

                var data = await Promise.all(
                    urls.map(
                        url =>
                        fetch(url, settings).then(
                            response => {
                                return response.json().then(responseJSON => {
                                    return responseJSON;
                                })
                            }
                        )));

                sections = [...sections, ...data.flat()];

                console.log(`Fetched from courses ${iteration*asyncRequests+1} to ${iteration*asyncRequests+asyncRequests}. Sections: ${sections.length}.`);

                iteration++;
                if (iteration >= maxIterations) {
                    alert('Max iterations reached.');
                    flag = true;
                }


            } catch (error) {
                console.log(error)
                toggleLoadingSpinner();
                throw (error)
            }
        }

        return sections;
    }

    async function getCourses() {
        var courses = [];
        var parsedLinkHeader;

        let subAccountParams = '';
        courseSubAccounts.forEach(subAccount => subAccountParams += `&by_subaccounts[]=sis_account_id:${subAccount}`);
        const standardParams = 'with_enrollments=true&enrollment_type[]=student&blueprint=false&include[]=term&per_page=100';

        var settings = {
            headers: {
                "X-CSRFToken": getCsrfToken()
            },
        }

        console.log(`Fetching courses to check...`);
        var i = 1;



        for (let j = 0; j < courseTerms.length; j++) {
            var url = `${window.location.origin}/api/v1/accounts/1/courses?${standardParams}${subAccountParams}&enrollment_term_id=sis_term_id:${courseTerms[j]}`;
            // if (courseTerms[j] == 6315) debugger;
            while (url !== null) {
                const response = await fetch(url, settings)

                if (!response.ok) {
                    break;
                }

                const data = await response.json();
                courses = [...courses, ...data];

                parsedLinkHeader = parseLinkHeader(response.headers.get('link'));

                if (parsedLinkHeader && parsedLinkHeader.next) {
                    url = parsedLinkHeader.next;
                } else {
                    url = null;
                }
                console.log(`Fetched from page ${i}.\nTerm: ${courseTerms[j]}\nCourses: ${courses.length}. `);
                i++;
            }
        }

        return courses;
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